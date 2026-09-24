# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Agregação das fichas em panoramas (estado e municípios)."""

from typing import Iterable, TypedDict

from pipeline.ficha import Ficha, etapas_oferecidas
from pipeline.indicadores import (
    CATEGORIAS_CONTADAS,
    COLUNA_SITUACAO,
    ETAPAS,
    GRUPOS,
    INFRAESTRUTURA,
    SITUACAO_EM_ATIVIDADE,
    TOTAIS,
)
from pipeline.leitor_censo import LinhaCenso


class Agregado(TypedDict):
    """Resumo de um conjunto de escolas (estado ou município) em um ano."""

    escolas: int
    em_atividade: int
    categorias: dict[str, dict[str, int]]
    totais: dict[str, int]
    grupos: dict[str, list[int]]
    infraestrutura: list[int]
    etapas: dict[str, int]


def _numero(linha: LinhaCenso, coluna: str) -> int:
    valor = linha.get(coluna, 0)
    return valor if isinstance(valor, int) else 0


def novo_agregado() -> Agregado:
    """Cria um agregado zerado com todas as chaves previstas em indicadores.py.

    Exemplo:
        >>> novo_agregado()["totais"]["matriculas"]
        0
    """
    return {
        "escolas": 0,
        "em_atividade": 0,
        "categorias": {coluna: {} for coluna in [COLUNA_SITUACAO, *CATEGORIAS_CONTADAS]},
        "totais": {nome: 0 for nome, _, _ in TOTAIS},
        "grupos": {grupo["id"]: [0] * len(grupo["itens"]) for grupo in GRUPOS},
        # Contagem de escolas em atividade que atendem cada indicador; o site calcula o percentual.
        "infraestrutura": [0] * len(INFRAESTRUTURA),
        "etapas": {sigla: 0 for sigla in ETAPAS},
    }


def _somar_categorias(agregado: Agregado, escola: LinhaCenso, colunas: list[str]) -> None:
    for coluna in colunas:
        if coluna not in escola:
            continue
        contagem = agregado["categorias"][coluna]
        codigo = str(escola[coluna])
        contagem[codigo] = contagem.get(codigo, 0) + 1


def _somar_quantidades(agregado: Agregado, ficha: Ficha) -> None:
    for nome, tabela, coluna in TOTAIS:
        agregado["totais"][nome] += _numero(ficha[tabela], coluna)
    for grupo in GRUPOS:
        somas = agregado["grupos"][grupo["id"]]
        for posicao, (_, coluna) in enumerate(grupo["itens"]):
            somas[posicao] += _numero(ficha[grupo["tabela"]], coluna)


def _somar_escola_ativa(agregado: Agregado, escola: LinhaCenso) -> None:
    agregado["em_atividade"] += 1
    _somar_categorias(agregado, escola, CATEGORIAS_CONTADAS)
    for posicao, indicador in enumerate(INFRAESTRUTURA):
        if escola.get(indicador["coluna"]) == indicador["valor"]:
            agregado["infraestrutura"][posicao] += 1
    for sigla in etapas_oferecidas(escola):
        agregado["etapas"][sigla] += 1


def somar_ficha(agregado: Agregado, ficha: Ficha) -> None:
    """Acumula uma ficha no agregado.

    Exemplo:
        >>> agregado = novo_agregado(); somar_ficha(agregado, ficha)
    """
    escola = ficha["escola"]
    agregado["escolas"] += 1
    # A situação é contada em todas as escolas; as demais categorias, só nas em atividade.
    _somar_categorias(agregado, escola, [COLUNA_SITUACAO])
    _somar_quantidades(agregado, ficha)
    if escola.get(COLUNA_SITUACAO) == SITUACAO_EM_ATIVIDADE:
        _somar_escola_ativa(agregado, escola)


def agregar(fichas: Iterable[Ficha]) -> Agregado:
    """Agrega um conjunto de fichas (todas do estado ou de um município).

    Exemplo:
        >>> agregar(fichas_do_municipio)["totais"]["matriculas"]
        25310
    """
    agregado = novo_agregado()
    for ficha in fichas:
        somar_ficha(agregado, ficha)
    return agregado
