# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import unittest

from pipeline.cursos import ranking_cursos
from pipeline.ficha import montar_ficha
from tests.pipeline.amostras import censo_amostra


class RankingCursosTeste(unittest.TestCase):
    def test_ordena_por_matriculas_e_limita(self) -> None:
        censo = censo_amostra()
        fichas = [montar_ficha(codigo, censo) for codigo in censo.escolas]
        self.assertEqual(ranking_cursos(fichas, limite=1), [["Enfermagem", "Ambiente e saúde", 1, 30]])
