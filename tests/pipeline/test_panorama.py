# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import unittest

from pipeline.ficha import montar_ficha
from pipeline.indicadores import INFRAESTRUTURA
from pipeline.panorama import agregar, novo_agregado
from tests.pipeline.amostras import censo_amostra


class PanoramaTeste(unittest.TestCase):
    def setUp(self) -> None:
        censo = censo_amostra()
        self.agregado = agregar(montar_ficha(codigo, censo) for codigo in censo.escolas)

    def test_novo_agregado_zerado(self) -> None:
        self.assertEqual(novo_agregado()["totais"]["matriculas"], 0)

    def test_conta_escolas_e_ativas(self) -> None:
        self.assertEqual((self.agregado["escolas"], self.agregado["em_atividade"]), (3, 2))

    def test_situacao_conta_todas_e_dependencia_so_ativas(self) -> None:
        self.assertEqual(self.agregado["categorias"]["TP_SITUACAO_FUNCIONAMENTO"], {"1": 2, "3": 1})
        self.assertEqual(self.agregado["categorias"]["TP_DEPENDENCIA"], {"2": 1, "4": 1})

    def test_soma_totais_e_grupos(self) -> None:
        self.assertEqual(self.agregado["totais"]["matriculas"], 140)
        self.assertEqual(self.agregado["grupos"]["mat_etapa"][0], 40)

    def test_infraestrutura_conta_internet(self) -> None:
        posicao = [indicador["coluna"] for indicador in INFRAESTRUTURA].index("IN_INTERNET")
        self.assertEqual(self.agregado["infraestrutura"][posicao], 1)
