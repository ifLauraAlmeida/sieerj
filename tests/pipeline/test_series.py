# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import unittest

from pipeline.ficha import Ficha
from pipeline.indicadores import METRICAS_SERIE
from pipeline.series import colunas_presentes, valor_metrica_escola, valores_agregados, valores_escola

POSICAO = {metrica["id"]: posicao for posicao, metrica in enumerate(METRICAS_SERIE)}
PRESENTES = colunas_presentes({"escola": ["IN_INTERNET", "IN_ACESSIBILIDADE_INEXISTENTE"], "matricula": ["QT_MAT_BAS"], "turma": [], "docente": [], "gestor": []})


def ficha(situacao: int, **escola: int) -> Ficha:
    return {"escola": {"TP_SITUACAO_FUNCIONAMENTO": situacao, **escola}, "matricula": {"QT_MAT_BAS": 10}, "turma": {}, "docente": {}, "gestor": {}, "cursos_tecnicos": []}


class SeriesTeste(unittest.TestCase):
    def test_coluna_nao_coletada_vira_none(self) -> None:
        self.assertIsNone(valor_metrica_escola(ficha(1), METRICAS_SERIE[POSICAO["QT_TUR_BAS"]], PRESENTES))

    def test_quantidade_zerada_omitida_vira_zero(self) -> None:
        vazia: Ficha = {**ficha(1), "matricula": {}}
        self.assertEqual(valor_metrica_escola(vazia, METRICAS_SERIE[POSICAO["QT_MAT_BAS"]], PRESENTES), 0)

    def test_infraestrutura_respeita_valor_esperado_e_vazio(self) -> None:
        valores = valores_escola(ficha(1, IN_INTERNET=1, IN_ACESSIBILIDADE_INEXISTENTE=1), PRESENTES)
        self.assertEqual((valores[POSICAO["IN_INTERNET"]], valores[POSICAO["IN_ACESSIBILIDADE_INEXISTENTE"]]), (1, 0))
        self.assertIsNone(valores_escola(ficha(3), PRESENTES)[POSICAO["IN_INTERNET"]])

    def test_agregado_percentual_so_entre_ativas(self) -> None:
        fichas = [ficha(1, IN_INTERNET=1), ficha(1, IN_INTERNET=0), ficha(2, IN_INTERNET=1)]
        valores = valores_agregados(fichas, PRESENTES)
        self.assertEqual(valores[0], 2)
        self.assertEqual(valores[1 + POSICAO["QT_MAT_BAS"]], 30)
        self.assertEqual(valores[1 + POSICAO["IN_INTERNET"]], 50.0)
        self.assertIsNone(valores[1 + POSICAO["QT_TUR_BAS"]])
