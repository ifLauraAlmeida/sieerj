# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import unittest

from pipeline.__main__ import anos_processados, interpretar_anos
from tests.pipeline.falsos import SistemaArquivosFalso


class MainTeste(unittest.TestCase):
    def test_interpretar_anos(self) -> None:
        self.assertEqual(interpretar_anos("2019-2021, 2025,2020"), [2019, 2020, 2021, 2025])

    def test_interpretar_anos_invalido(self) -> None:
        with self.assertRaisesRegex(ValueError, "AAAA-AAAA"):
            interpretar_anos("19")

    def test_anos_processados_exige_meta(self) -> None:
        arquivos = SistemaArquivosFalso()
        arquivos.gravados["p/2024/meta.json"] = {}
        arquivos.gravados["p/2025/dicionario.json"] = {}
        self.assertEqual(anos_processados(arquivos, "p"), [2024])
        self.assertEqual(anos_processados(arquivos, "nada"), [])
