# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import unittest

from pipeline.coleta import URL_PAGINA_MICRODADOS, baixar_ano, caminho_zip, coletar, extrair_links_microdados, selecionar_anos
from tests.pipeline.falsos import ClienteHttpFalso, SistemaArquivosFalso

URL_2024 = "https://download.inep.gov.br/dados_abertos/microdados_censo_escolar_2024.zip"
URL_2025 = "https://download.inep.gov.br/dados_abertos/microdados_censo_escolar_2025_.zip"
PAGINA = f'<p><a href="{URL_2024}">2024</a> <a href="{URL_2025}">2025</a> <a href="/outro.pdf">x</a></p>'


class ColetaTeste(unittest.TestCase):
    def test_extrai_links_incluindo_sufixo_de_2025(self) -> None:
        self.assertEqual(extrair_links_microdados(PAGINA), {2024: URL_2024, 2025: URL_2025})

    def test_selecionar_anos_rejeita_ausente_e_legado(self) -> None:
        links = extrair_links_microdados(PAGINA)
        with self.assertRaisesRegex(ValueError, "2023"):
            selecionar_anos(links, [2023])
        with self.assertRaisesRegex(ValueError, "legado"):
            selecionar_anos(links, [2005])

    def test_caminho_zip_mantem_nome_original(self) -> None:
        self.assertEqual(caminho_zip("b", 2025, URL_2025), "b/2025/microdados_censo_escolar_2025_.zip")

    def test_baixar_grava_metadados_e_nao_repete(self) -> None:
        arquivos = SistemaArquivosFalso()
        cliente = ClienteHttpFalso({}, {URL_2024: b"zip"}, arquivos)
        baixar_ano(cliente, arquivos, 2024, URL_2024, "b")
        baixar_ano(cliente, arquivos, 2024, URL_2024, "b")
        self.assertEqual(cliente.baixados, [URL_2024])
        self.assertEqual(arquivos.gravados["b/2024/metadados.json"]["bytes"], 3)

    def test_coletar_raspa_e_baixa_os_anos(self) -> None:
        arquivos = SistemaArquivosFalso()
        cliente = ClienteHttpFalso({URL_PAGINA_MICRODADOS: PAGINA}, {URL_2024: b"a", URL_2025: b"b"}, arquivos)
        self.assertEqual(sorted(coletar(cliente, arquivos, [2024, 2025], "b")), [2024, 2025])
