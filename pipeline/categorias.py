# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Tradução do texto de categorias do dicionário do INEP em um mapa código → rótulo."""

import re

# Cada categoria ocupa uma linha da célula ("1 - Federal\n2 - Estadual"); linhas sem código
# ("   - Não aplicável ...") descrevem valores vazios e são ignoradas.
_PADRAO_CATEGORIA = re.compile(r"^\s*(\d+)\s*-\s*(.+?)\s*$")


def interpretar_categorias(texto: str) -> dict[str, str]:
    """Converte a coluna "Categoria" do dicionário em {código: rótulo}.

    Exemplo:
        >>> interpretar_categorias("1 - Urbana\\n2 - Rural")
        {'1': 'Urbana', '2': 'Rural'}
    """
    categorias: dict[str, str] = {}
    for trecho in texto.splitlines():
        encontrado = _PADRAO_CATEGORIA.match(trecho)
        if encontrado:
            categorias[encontrado.group(1)] = encontrado.group(2)
    return categorias
