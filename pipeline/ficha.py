# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Montagem da ficha de cada escola e da linha correspondente no índice de busca."""

from typing import TypedDict

from pipeline.indicadores import ETAPAS
from pipeline.leitor_censo import LinhaCenso
from pipeline.tabelas import CensoRJ


class Ficha(TypedDict):
    """Dados de uma escola em um ano, separados pelas tabelas do layout 2025."""

    escola: LinhaCenso
    matricula: LinhaCenso
    turma: LinhaCenso
    docente: LinhaCenso
    gestor: LinhaCenso
    cursos_tecnicos: list[LinhaCenso]


ColunaIndice = int | str
COLUNAS_INDICE = [
    "codigo",
    "nome",
    "municipio",
    "dependencia",
    "localizacao",
    "situacao",
    "matriculas",
    "turmas",
    "docentes",
    "etapas",
]


def montar_ficha(codigo: int, censo: CensoRJ) -> Ficha:
    """Junta as linhas de todas as tabelas de uma escola.

    Exemplo:
        >>> montar_ficha(33036594, censo)["escola"]["NO_ENTIDADE"]
        'CE NAZIRA SALOMAO'
    """
    def complemento(tabela: str) -> LinhaCenso:
        """Linha da escola numa tabela complementar ({} se ausente)."""
        return censo.complementares.get(tabela, {}).get(codigo, {})

    return {
        "escola": censo.escolas[codigo],
        "matricula": complemento("matricula"),
        "turma": complemento("turma"),
        "docente": complemento("docente"),
        "gestor": complemento("gestor"),
        "cursos_tecnicos": censo.cursos.get(codigo, []),
    }


def etapas_oferecidas(escola: LinhaCenso) -> list[str]:
    """Lista as siglas das etapas que a escola declara oferecer.

    Exemplo:
        >>> etapas_oferecidas({"IN_COMUM_CRECHE": 1, "IN_EJA": 1})
        ['CRE', 'EJA']
    """
    return [sigla for sigla, (_, colunas) in ETAPAS.items() if any(escola.get(c) == 1 for c in colunas)]


def linha_indice(ficha: Ficha) -> list[ColunaIndice]:
    """Resume a ficha numa linha compacta, na ordem de COLUNAS_INDICE.

    Exemplo:
        >>> linha_indice(ficha)
        [33036594, 'CE NAZIRA SALOMAO', 3300100, 2, 1, 1, 812, 24, 40, 'MED,EJA']
    """
    escola = ficha["escola"]
    return [
        escola["CO_ENTIDADE"],
        escola["NO_ENTIDADE"],
        escola["CO_MUNICIPIO"],
        escola.get("TP_DEPENDENCIA", 0),
        escola.get("TP_LOCALIZACAO", 0),
        escola.get("TP_SITUACAO_FUNCIONAMENTO", 0),
        ficha["matricula"].get("QT_MAT_BAS", 0),
        ficha["turma"].get("QT_TUR_BAS", 0),
        ficha["docente"].get("QT_DOC_BAS", 0),
        ",".join(etapas_oferecidas(escola)),
    ]
