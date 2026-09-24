# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import unittest

from pipeline.ficha import etapas_oferecidas, linha_indice, montar_ficha
from tests.pipeline.amostras import censo_amostra


class FichaTeste(unittest.TestCase):
    def test_etapas_oferecidas(self) -> None:
        self.assertEqual(etapas_oferecidas({"IN_COMUM_CRECHE": 1, "IN_EJA": 1, "IN_REGULAR": 1}), ["CRE", "EJA"])

    def test_montar_ficha_junta_tabelas(self) -> None:
        ficha = montar_ficha(33000001, censo_amostra())
        self.assertEqual(ficha["turma"], {"QT_TUR_BAS": 4})
        self.assertEqual(ficha["cursos_tecnicos"], [])

    def test_montar_ficha_escola_sem_complementos(self) -> None:
        ficha = montar_ficha(33000003, censo_amostra())
        self.assertEqual(ficha["matricula"], {})

    def test_linha_indice(self) -> None:
        linha = linha_indice(montar_ficha(33000001, censo_amostra()))
        self.assertEqual(linha, [33000001, "ESCOLA A", 3300100, 2, 1, 1, 100, 4, 8, "EJA"])
