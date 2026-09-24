# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import io
import json
import unittest

from pipeline.registro import registrar


class RegistrarTeste(unittest.TestCase):
    def test_emite_json_com_campos(self) -> None:
        saida = io.StringIO()
        registrar("tabela_lida", saida=saida, tabela="escola", linhas=3)
        linha = json.loads(saida.getvalue())
        self.assertEqual((linha["evento"], linha["tabela"], linha["linhas"]), ("tabela_lida", "escola", 3))
