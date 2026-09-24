# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import unittest

from pipeline.arquivo_unico import carregar_censo_unico, separar_colunas, separar_linha, tabela_da_coluna
from tests.pipeline.amostras import DIR_2019, arquivos_unico
from tests.pipeline.falsos import SistemaArquivosFalso

CSV = f"{DIR_2019}/microdados_ed_basica_2019/dados/microdados_ed_basica_2019.csv"
SUPLEMENTO = f"{DIR_2019}/microdados_ed_basica_2019/dados/suplemento_cursos_tecnicos_2019.csv"


class ArquivoUnicoTeste(unittest.TestCase):
    def test_tabela_da_coluna(self) -> None:
        self.assertEqual([tabela_da_coluna(c) for c in ("QT_TRANSP_PUBLICO", "QT_DOC_BAS", "QT_SALAS_UTILIZADAS")], ["matricula", "docente", "escola"])

    def test_separar_colunas_e_linha(self) -> None:
        self.assertEqual(separar_colunas(["CO_ENTIDADE", "QT_TUR_BAS"])["turma"], ["QT_TUR_BAS"])
        self.assertEqual(separar_linha({"CO_ENTIDADE": 1, "QT_MAT_BAS": 5})["matricula"], {"QT_MAT_BAS": 5})

    def test_carrega_no_mesmo_formato_do_layout_em_tabelas(self) -> None:
        censo = carregar_censo_unico(SistemaArquivosFalso(arquivos_unico()), CSV, SUPLEMENTO)
        self.assertEqual(sorted(censo.escolas), [33000001, 33000009])
        self.assertEqual(censo.complementares["matricula"][33000001], {"QT_MAT_BAS": 80, "QT_TRANSP_PUBLICO": 10})
        self.assertEqual(censo.complementares["gestor"][33000001], {})
        self.assertEqual(censo.cursos[33000009][0]["QT_MAT_CURSO_TEC"], 25)
        self.assertNotIn("QT_GEST_BAS", censo.colunas["gestor"])

    def test_sem_suplemento(self) -> None:
        censo = carregar_censo_unico(SistemaArquivosFalso(arquivos_unico()), CSV, None)
        self.assertEqual((censo.cursos, censo.colunas["cursos_tecnicos"]), ({}, []))
