# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import unittest

from pipeline.leitor_censo import compactar_linha, converter_valor, ler_linhas_rj, localizar_tabela
from tests.pipeline.amostras import DIRETORIO, arquivos_censo
from tests.pipeline.falsos import SistemaArquivosFalso


class LeitorCensoTeste(unittest.TestCase):
    def test_converter_numero(self) -> None:
        self.assertEqual(converter_valor("QT_MAT_BAS", "120"), 120)

    def test_converter_preserva_cnpj_com_zero_a_esquerda(self) -> None:
        self.assertEqual(converter_valor("NU_CNPJ_ESCOLA_PRIVADA", "0123"), "0123")

    def test_compactar_descarta_vazios_e_quantidades_zeradas(self) -> None:
        linha = compactar_linha(["QT_A", "IN_B", "C", "D"], ["0", "0", "", "x"], frozenset({"D"}))
        self.assertEqual(linha, {"IN_B": 0})

    def test_ler_linhas_rj_filtra_uf(self) -> None:
        arquivos = SistemaArquivosFalso(arquivos_censo())
        linhas = list(ler_linhas_rj(arquivos, f"{DIRETORIO}/Tabela_Escola_2025_V2.csv"))
        self.assertEqual(len(linhas), 3)
        self.assertTrue(all(valores[2] == "RJ" for _, valores in linhas))

    def test_localizar_tabela_ignora_maiusculas(self) -> None:
        arquivos = SistemaArquivosFalso(arquivos_censo())
        caminho = localizar_tabela(arquivos, DIRETORIO, "tabela_gestor_escolar_*.csv")
        self.assertTrue(caminho.endswith("Tabela_Gestor_Escolar_2025_v2.csv"))

    def test_localizar_tabela_inexistente_informa_padrao(self) -> None:
        with self.assertRaisesRegex(FileNotFoundError, "tabela_x_\\*.csv"):
            localizar_tabela(SistemaArquivosFalso(arquivos_censo()), DIRETORIO, "tabela_x_*.csv")
