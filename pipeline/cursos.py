# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Ranking dos cursos técnicos por número de matrículas."""

from typing import Iterable

from pipeline.ficha import Ficha

LinhaCurso = list[int | str]
LIMITE_RANKING = 15


def _chave_curso(curso: dict[str, int | str]) -> tuple[str, str]:
    return str(curso.get("NO_CURSO_EDUC_PROFISSIONAL", "")), str(curso.get("NO_AREA_CURSO_PROFISSIONAL", ""))


def ranking_cursos(fichas: Iterable[Ficha], limite: int = LIMITE_RANKING) -> list[LinhaCurso]:
    """Soma escolas e matrículas por curso e devolve os maiores como [curso, área, escolas, matrículas].

    Exemplo:
        >>> ranking_cursos(fichas, limite=1)
        [['Enfermagem', 'Ambiente e saúde', 120, 15432]]
    """
    somas: dict[tuple[str, str], list[int]] = {}
    for ficha in fichas:
        for curso in ficha["cursos_tecnicos"]:
            acumulado = somas.setdefault(_chave_curso(curso), [0, 0])
            acumulado[0] += 1
            matriculas = curso.get("QT_MAT_CURSO_TEC", 0)
            acumulado[1] += matriculas if isinstance(matriculas, int) else 0
    ordenados = sorted(somas.items(), key=lambda item: item[1][1], reverse=True)
    return [[nome, area, escolas, matriculas] for (nome, area), (escolas, matriculas) in ordenados[:limite]]
