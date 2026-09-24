# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import unittest

from pipeline.formatos import FORMATO_TABELAS, FORMATO_UNICO, carregar_ano, localizar_arquivos, localizar_dicionario
from tests.pipeline.amostras import DICIONARIO_XLSX, DIR_2019, DIR_2025, arquivos_censo, arquivos_unico, zips_dicionario
from tests.pipeline.falsos import SistemaArquivosFalso


def ano_extraido(textos: dict[str, str], diretorio: str) -> SistemaArquivosFalso:
    zips = zips_dicionario(f"{diretorio}/m/{DICIONARIO_XLSX}")
    zips[(f"{diretorio}/m/Anexos/ANEXO I - Dicionário de Dados/~$dicionario.xlsx", "x")] = b""
    return SistemaArquivosFalso(textos, zips)


class FormatosTeste(unittest.TestCase):
    def test_dicionario_ignora_temporario_do_excel(self) -> None:
        arquivos = ano_extraido({}, DIR_2019)
        self.assertEqual(localizar_dicionario(arquivos, DIR_2019), f"{DIR_2019}/m/{DICIONARIO_XLSX}")

    def test_detecta_layout_unico(self) -> None:
        localizados = localizar_arquivos(ano_extraido(arquivos_unico(), DIR_2019), DIR_2019)
        self.assertEqual(localizados.formato, FORMATO_UNICO)
        self.assertTrue(localizados.suplemento_cursos)

    def test_detecta_layout_em_tabelas_e_carrega(self) -> None:
        arquivos = ano_extraido(arquivos_censo(f"{DIR_2025}/m/dados"), DIR_2025)
        localizados = localizar_arquivos(arquivos, DIR_2025)
        self.assertEqual((localizados.formato, localizados.principal), (FORMATO_TABELAS, f"{DIR_2025}/m/dados"))
        self.assertEqual(len(carregar_ano(arquivos, localizados).escolas), 3)

    def test_layout_desconhecido_informa_esperado(self) -> None:
        with self.assertRaisesRegex(FileNotFoundError, "microdados_ed_basica"):
            localizar_arquivos(ano_extraido({}, DIR_2019), DIR_2019)
