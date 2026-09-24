# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Logs estruturados em JSON para acompanhar a execução do pipeline."""

import json
import sys
import time
from typing import TextIO


def registrar(evento: str, saida: TextIO = sys.stderr, **campos: int | str) -> None:
    """Emite uma linha JSON com o evento e seus campos.

    Exemplo:
        >>> registrar("tabela_lida", tabela="escola", linhas=13035)
    """
    linha = {"ts": round(time.time(), 3), "evento": evento, **campos}
    saida.write(json.dumps(linha, ensure_ascii=False) + "\n")
