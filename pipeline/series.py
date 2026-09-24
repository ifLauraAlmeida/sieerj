# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Valores anuais das métricas de série (escola e agregados), distinguindo zero de "não coletado"."""

from dataclasses import dataclass, field
from typing import Iterable, cast

from pipeline.ficha import Ficha
from pipeline.leitor_censo import LinhaCenso
from pipeline.indicadores import METRICAS_SERIE, SITUACAO_EM_ATIVIDADE, TIPO_INFRAESTRUTURA, MetricaSerie

ValorSerie = int | float | None
ColunasPresentes = dict[str, frozenset[str]]


def colunas_presentes(colunas_por_tabela: dict[str, list[str]]) -> ColunasPresentes:
    """Converte as colunas do meta.json do ano em conjuntos para consulta rápida.

    Exemplo:
        >>> colunas_presentes({"escola": ["IN_INTERNET"]})["escola"]
        frozenset({'IN_INTERNET'})
    """
    return {tabela: frozenset(colunas) for tabela, colunas in colunas_por_tabela.items()}


def valor_metrica_escola(ficha: Ficha, metrica: MetricaSerie, presentes: ColunasPresentes) -> int | None:
    """Valor da métrica para a escola no ano; None quando o Censo não coletou a variável.

    Exemplo:
        >>> valor_metrica_escola(ficha, METRICAS_SERIE[0], presentes)
        993
    """
    tabela, coluna = metrica["tabela"], metrica["coluna"]
    if coluna not in presentes.get(tabela, frozenset()):
        return None
    linha = cast(dict[str, LinhaCenso], ficha)[tabela]
    if metrica["tipo"] != TIPO_INFRAESTRUTURA:
        valor = linha.get(coluna, 0)
        return valor if isinstance(valor, int) else 0
    # Escolas extintas ou paralisadas não respondem à infraestrutura: vazio vira None, não "não possui".
    if coluna not in linha:
        return None
    return 1 if linha[coluna] == metrica["valor"] else 0


def valores_escola(ficha: Ficha, presentes: ColunasPresentes) -> list[int | None]:
    """Linha de valores da escola na ordem de METRICAS_SERIE.

    Exemplo:
        >>> valores_escola(ficha, presentes)[:2]
        [993, 33]
    """
    return [valor_metrica_escola(ficha, metrica, presentes) for metrica in METRICAS_SERIE]


@dataclass
class _Acumulador:
    somas: list[int] = field(default_factory=lambda: [0] * len(METRICAS_SERIE))
    respondentes: list[int] = field(default_factory=lambda: [0] * len(METRICAS_SERIE))
    escolas_ativas: int = 0


def _acumular(acumulador: _Acumulador, ficha: Ficha, presentes: ColunasPresentes) -> None:
    ativa = ficha["escola"].get("TP_SITUACAO_FUNCIONAMENTO") == SITUACAO_EM_ATIVIDADE
    acumulador.escolas_ativas += int(ativa)
    for posicao, metrica in enumerate(METRICAS_SERIE):
        valor = valor_metrica_escola(ficha, metrica, presentes)
        # Infraestrutura só entre escolas em atividade, como no panorama anual.
        if valor is None or (metrica["tipo"] == TIPO_INFRAESTRUTURA and not ativa):
            continue
        acumulador.somas[posicao] += valor
        acumulador.respondentes[posicao] += 1


def _finalizar(acumulador: _Acumulador, presentes: ColunasPresentes) -> list[ValorSerie]:
    valores: list[ValorSerie] = [acumulador.escolas_ativas]
    for posicao, metrica in enumerate(METRICAS_SERIE):
        if metrica["coluna"] not in presentes.get(metrica["tabela"], frozenset()):
            valores.append(None)
        elif metrica["tipo"] == TIPO_INFRAESTRUTURA:
            respondentes = acumulador.respondentes[posicao]
            valores.append(round(100 * acumulador.somas[posicao] / respondentes, 1) if respondentes else None)
        else:
            valores.append(acumulador.somas[posicao])
    return valores


def valores_agregados(fichas: Iterable[Ficha], presentes: ColunasPresentes) -> list[ValorSerie]:
    """Linha agregada: [escolas em atividade, *métricas]; infraestrutura em % das escolas em atividade.

    Exemplo:
        >>> valores_agregados(fichas_do_municipio, presentes)[:2]
        [412, 98231]
    """
    acumulador = _Acumulador()
    for ficha in fichas:
        _acumular(acumulador, ficha, presentes)
    return _finalizar(acumulador, presentes)
