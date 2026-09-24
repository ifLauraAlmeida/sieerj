# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import unittest

from pipeline.indicadores import GRUPOS, exportar_indicadores


class IndicadoresTeste(unittest.TestCase):
    def test_exporta_etapas_com_rotulo_e_colunas(self) -> None:
        exportado = exportar_indicadores()
        self.assertEqual(exportado["etapas"]["CRE"], "Creche")
        self.assertIn("IN_COMUM_CRECHE", exportado["colunas_etapas"]["CRE"])

    def test_ids_de_grupo_sao_unicos(self) -> None:
        ids = [grupo["id"] for grupo in GRUPOS]
        self.assertEqual(len(ids), len(set(ids)))
