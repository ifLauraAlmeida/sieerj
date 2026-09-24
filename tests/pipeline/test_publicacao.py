# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import unittest

from pipeline.prata import processar_ano
from pipeline.publicacao import (
    HistoricoRJ,
    agrupar_por_municipio,
    alinhar_anos,
    lote_da_escola,
    montar_indice,
    montar_lotes,
    montar_panorama,
    montar_series,
    publicar,
)
from tests.pipeline.amostras import DICIONARIO_XLSX, DIR_2019, DIR_2025, arquivos_censo, arquivos_unico, censo_amostra, zips_dicionario
from tests.pipeline.falsos import SistemaArquivosFalso
from pipeline.ficha import montar_ficha


def arquivos_dois_anos() -> SistemaArquivosFalso:
    """2019 (arquivo único) e 2025 (tabelas) já processados na camada prata."""
    textos = {**arquivos_unico(), **arquivos_censo(f"{DIR_2025}/m/dados")}
    zips = {**zips_dicionario(f"{DIR_2019}/m/{DICIONARIO_XLSX}"), **zips_dicionario(f"{DIR_2025}/m/{DICIONARIO_XLSX}")}
    arquivos = SistemaArquivosFalso(textos, zips)
    processar_ano(arquivos, 2019, DIR_2019, "p")
    processar_ano(arquivos, 2025, DIR_2025, "p")
    return arquivos


class PublicacaoTeste(unittest.TestCase):
    def setUp(self) -> None:
        self.arquivos = arquivos_dois_anos()
        self.total = publicar(self.arquivos, [2025, 2019], "p", "s")

    def test_total_une_escolas_de_todos_os_anos(self) -> None:
        self.assertEqual(self.total, 4)

    def test_anos_e_panoramas(self) -> None:
        self.assertEqual(self.arquivos.gravados["s/anos.json"], {"anos": [2019, 2025], "mais_recente": 2025, "lotes_fichas": 256})
        self.assertEqual(self.arquivos.gravados["s/panoramas/2019.json"]["estado"]["escolas"], 2)

    def test_escola_guarda_ultimo_ano_e_serie(self) -> None:
        lote = self.arquivos.gravados[f"s/escolas/{lote_da_escola(33000001)}.json"]["33000001"]
        self.assertEqual((lote["ano"], lote["serie"]["anos"]), (2025, [2019, 2025]))
        self.assertEqual(lote["serie"]["valores"][0][0], 80)

    def test_escola_que_sumiu_fica_com_ano_antigo_no_indice(self) -> None:
        indice = self.arquivos.gravados["s/indice.json"]
        linha = next(l for l in indice["linhas"] if l[0] == 33000009)
        self.assertEqual(linha[-1], 2019)

    def test_series_alinhadas_com_none_para_gestor_de_2019(self) -> None:
        series = self.arquivos.gravados["s/series.json"]
        posicao = series["metricas"].index("QT_GEST_BAS")
        self.assertEqual([linha[posicao] for linha in series["estado"]], [None, 1])

    def test_publicar_sem_anos_falha(self) -> None:
        with self.assertRaisesRegex(ValueError, "Nenhum ano"):
            publicar(self.arquivos, [], "p", "s")


class FuncoesPublicacaoTeste(unittest.TestCase):
    def setUp(self) -> None:
        censo = censo_amostra()
        self.fichas = [montar_ficha(codigo, censo) for codigo in censo.escolas]

    def test_lote_da_escola(self) -> None:
        self.assertEqual((lote_da_escola(33036594), lote_da_escola(10, total_lotes=4)), (50, 2))

    def test_agrupar_por_municipio(self) -> None:
        grupos = agrupar_por_municipio(self.fichas)
        self.assertEqual({codigo: len(fichas) for codigo, fichas in grupos.items()}, {3300100: 1, 3303302: 2})

    def test_panorama_tem_estado_e_municipios(self) -> None:
        self.assertEqual(sorted(montar_panorama(self.fichas, 2025)["municipios"]), ["3300100", "3303302"])

    def test_alinhar_anos(self) -> None:
        self.assertEqual(alinhar_anos([2023, 2024], {2024: [1]}), [None, [1]])

    def test_historico_vazio(self) -> None:
        historico = HistoricoRJ()
        self.assertEqual((montar_lotes(historico), montar_indice(historico)["linhas"], montar_series(historico)["estado"]), ({}, [], []))
