# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import unittest

from pipeline.prata import VERSAO_PRATA, colunas_coletadas, ler_fichas, prata_atualizada, processar_ano
from tests.pipeline.amostras import DICIONARIO_XLSX, DIR_2019, arquivos_unico, zips_dicionario
from tests.pipeline.falsos import SistemaArquivosFalso


class PrataTeste(unittest.TestCase):
    def test_processa_ano_e_le_de_volta(self) -> None:
        arquivos = SistemaArquivosFalso(arquivos_unico(), zips_dicionario(f"{DIR_2019}/m/{DICIONARIO_XLSX}"))
        destino = processar_ano(arquivos, 2019, DIR_2019, "p")
        meta = arquivos.gravados["p/2019/meta.json"]
        self.assertEqual((destino, meta["formato"], meta["escolas"]), ("p/2019", "unico", 2))
        self.assertIn("TP_LOCALIZACAO", arquivos.gravados["p/2019/dicionario.json"])
        fichas = ler_fichas(arquivos, destino)
        self.assertEqual(fichas[0]["turma"], {"QT_TUR_BAS": 4})

    def test_colunas_coletadas_remove_nao_coletadas_no_ano(self) -> None:
        dicionario = {"IN_A": {"descricao": "", "categorias": {}, "anos_coleta": [2019]}}
        colunas = {"escola": ["IN_A", "IN_B"]}
        self.assertEqual(colunas_coletadas(colunas, dicionario, 2018), {"escola": ["IN_B"]})
        self.assertEqual(colunas_coletadas(colunas, dicionario, 2019), {"escola": ["IN_A", "IN_B"]})

    def test_pula_ano_ja_processado_na_versao_atual(self) -> None:
        arquivos = SistemaArquivosFalso(arquivos_unico(), zips_dicionario(f"{DIR_2019}/m/{DICIONARIO_XLSX}"))
        processar_ano(arquivos, 2019, DIR_2019, "p")
        self.assertTrue(prata_atualizada(arquivos, "p/2019"))
        arquivos.jsonl.clear()
        processar_ano(arquivos, 2019, DIR_2019, "p")
        self.assertEqual(arquivos.jsonl, {})
        processar_ano(arquivos, 2019, DIR_2019, "p", forcar=True)
        self.assertIn("p/2019/fichas.jsonl.gz", arquivos.jsonl)

    def test_versao_antiga_e_reprocessada(self) -> None:
        arquivos = SistemaArquivosFalso()
        arquivos.gravados["p/2019/meta.json"] = {"versao": VERSAO_PRATA - 1}
        self.assertFalse(prata_atualizada(arquivos, "p/2019"))
        self.assertFalse(prata_atualizada(arquivos, "p/2020"))
