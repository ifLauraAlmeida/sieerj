# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import unittest

from pipeline.categorias import interpretar_categorias


class InterpretarCategoriasTeste(unittest.TestCase):
    def test_uma_categoria_por_linha(self) -> None:
        self.assertEqual(interpretar_categorias("1 - Federal\n2 - Estadual"), {"1": "Federal", "2": "Estadual"})

    def test_ignora_linha_sem_codigo(self) -> None:
        texto = "1 - Próprio\n   - Não aplicável para escolas sem prédio"
        self.assertEqual(interpretar_categorias(texto), {"1": "Próprio"})

    def test_preserva_barra_dentro_do_rotulo(self) -> None:
        self.assertEqual(interpretar_categorias("3 - Galpão/Rancho"), {"3": "Galpão/Rancho"})

    def test_texto_vazio(self) -> None:
        self.assertEqual(interpretar_categorias(""), {})
