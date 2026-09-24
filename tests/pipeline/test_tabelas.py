# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import unittest

from tests.pipeline.amostras import censo_amostra


class CarregarCensoTeste(unittest.TestCase):
    def test_carrega_apenas_escolas_do_rj(self) -> None:
        self.assertEqual(sorted(censo_amostra().escolas), [33000001, 33000002, 33000003])

    def test_remove_colunas_redundantes_da_escola(self) -> None:
        escola = censo_amostra().escolas[33000001]
        self.assertNotIn("SG_UF", escola)
        self.assertEqual(escola["NO_ENTIDADE"], "ESCOLA A")

    def test_complementares_sem_colunas_de_identificacao(self) -> None:
        matricula = censo_amostra().complementares["matricula"][33000001]
        self.assertEqual(matricula, {"QT_MAT_BAS": 100, "QT_MAT_EJA": 100})

    def test_cursos_guardam_varias_linhas(self) -> None:
        self.assertEqual(len(censo_amostra().cursos[33000002]), 2)

    def test_registra_colunas_por_tabela(self) -> None:
        colunas = censo_amostra().colunas
        self.assertEqual(colunas["matricula"], ["QT_MAT_BAS", "QT_MAT_INF_CRE", "QT_MAT_EJA"])
        self.assertIn("IN_INTERNET", colunas["escola"])
