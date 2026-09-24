# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import unittest

from pipeline.extracao import MARCADOR_EXTRACAO, extrair_ano
from tests.pipeline.falsos import SistemaArquivosFalso


class ExtracaoTeste(unittest.TestCase):
    def test_extrai_uma_vez_e_grava_marcador(self) -> None:
        arquivos = SistemaArquivosFalso(zips={("b/2024/m.zip", "dados/a.csv"): b"x"})
        destino = extrair_ano(arquivos, 2024, "b/2024/m.zip", "e")
        self.assertEqual(arquivos.textos["e/2024/dados/a.csv"], "x")
        self.assertIn(f"e/2024/{MARCADOR_EXTRACAO}", arquivos.gravados)
        arquivos.textos.clear()
        extrair_ano(arquivos, 2024, "b/2024/m.zip", "e")
        self.assertEqual((destino, arquivos.textos), ("e/2024", {}))
