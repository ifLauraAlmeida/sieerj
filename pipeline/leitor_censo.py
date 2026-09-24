# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Leitura das tabelas do Censo Escolar restrita ao Estado do Rio de Janeiro."""

import csv
import fnmatch
from typing import Iterator

from pipeline.arquivos import SistemaArquivos

ValorCenso = int | str
LinhaCenso = dict[str, ValorCenso]

SIGLA_UF_RJ = "RJ"
# Filtro barato antes do parse completo: toda linha do RJ contém "...;RJ;33;...".
_MARCA_RJ = ";RJ;33;"
# Textos com zeros à esquerda que não podem virar número.
_PREFIXOS_TEXTO = ("NU_CNPJ", "DT_", "NO_")
# Colunas de nível nacional/estadual, iguais em todas as linhas do recorte.
COLUNAS_REDUNDANTES = frozenset({"NO_REGIAO", "CO_REGIAO", "NO_UF", "SG_UF", "CO_UF"})


def localizar_tabela(arquivos: SistemaArquivos, diretorio: str, padrao: str) -> str:
    """Encontra o CSV de uma tabela ignorando ano e versão no nome do arquivo.

    Exemplo:
        >>> localizar_tabela(arquivos, "dados", "tabela_escola_*.csv")
        'dados/Tabela_Escola_2025_V2.csv'
    """
    for nome in arquivos.listar(diretorio):
        if fnmatch.fnmatch(nome.lower(), padrao):
            return f"{diretorio}/{nome}"
    raise FileNotFoundError(f"Nenhum arquivo em {diretorio!r} corresponde a {padrao!r} (ex.: Tabela_Escola_2025_V2.csv)")


def converter_valor(coluna: str, texto: str) -> ValorCenso:
    """Converte códigos e quantidades em int, preservando textos e identificadores.

    Exemplo:
        >>> converter_valor("QT_MAT_BAS", "120"), converter_valor("NU_CNPJ_ESCOLA_PRIVADA", "0123")
        (120, '0123')
    """
    if texto.isdigit() and not coluna.startswith(_PREFIXOS_TEXTO):
        return int(texto)
    return texto


def compactar_linha(cabecalho: list[str], valores: list[str], ignoradas: frozenset[str]) -> LinhaCenso:
    """Mantém só o que carrega informação: descarta vazios e quantidades zeradas.

    Indicadores IN_ zerados são mantidos porque "não possui" também é informação.

    Exemplo:
        >>> compactar_linha(["QT_A", "IN_B", "C"], ["0", "0", ""], frozenset())
        {'IN_B': 0}
    """
    linha: LinhaCenso = {}
    for coluna, texto in zip(cabecalho, valores):
        if coluna in ignoradas or texto == "":
            continue
        valor = converter_valor(coluna, texto)
        if coluna.startswith("QT_") and valor == 0:
            continue
        linha[coluna] = valor
    return linha


def ler_linhas_rj(arquivos: SistemaArquivos, caminho: str) -> Iterator[tuple[list[str], list[str]]]:
    """Itera (cabeçalho, valores) apenas das linhas com SG_UF = RJ.

    Exemplo:
        >>> for cabecalho, valores in ler_linhas_rj(arquivos, "Tabela_Escola_2025_V2.csv"): ...
    """
    linhas = arquivos.ler_linhas(caminho)
    cabecalho = next(csv.reader([next(linhas)], delimiter=";"))
    posicao_uf = cabecalho.index("SG_UF")
    for texto in linhas:
        if _MARCA_RJ not in texto:
            continue
        valores = next(csv.reader([texto], delimiter=";"))
        if valores[posicao_uf] == SIGLA_UF_RJ:
            yield cabecalho, valores
