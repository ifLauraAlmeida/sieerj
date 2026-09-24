# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Carga do layout em arquivo único (Censo 2007–2024, republicado pelo INEP no formato harmonizado).

Nesse layout, uma única linha por escola traz cadastro, infraestrutura e as quantidades de
matrículas, turmas e docentes; os cursos técnicos vêm num suplemento opcional.
"""

from pipeline.arquivos import SistemaArquivos
from pipeline.leitor_censo import COLUNAS_REDUNDANTES, LinhaCenso, compactar_linha, ler_linhas_rj
from pipeline.registro import registrar
from pipeline.tabelas import CHAVE_ESCOLA, CensoRJ

# Prefixos que, no layout de 2025, pertencem às tabelas de Matrícula, Turma, Docente e Gestor.
PREFIXOS_TABELA: dict[str, tuple[str, ...]] = {
    "matricula": ("QT_MAT_", "QT_TRANSP_"),
    "turma": ("QT_TUR_",),
    "docente": ("QT_DOC_",),
    "gestor": ("QT_GEST_",),
}


def tabela_da_coluna(coluna: str) -> str:
    """Tabela do layout 2025 a que a coluna pertenceria; o resto é "escola".

    Exemplo:
        >>> tabela_da_coluna("QT_TUR_BAS"), tabela_da_coluna("IN_INTERNET")
        ('turma', 'escola')
    """
    for tabela, prefixos in PREFIXOS_TABELA.items():
        if coluna.startswith(prefixos):
            return tabela
    return "escola"


def separar_colunas(cabecalho: list[str]) -> dict[str, list[str]]:
    """Distribui o cabeçalho único entre escola e tabelas complementares.

    Exemplo:
        >>> separar_colunas(["CO_ENTIDADE", "QT_MAT_BAS"])
        {'escola': ['CO_ENTIDADE'], 'matricula': ['QT_MAT_BAS'], 'turma': [], 'docente': [], 'gestor': []}
    """
    colunas: dict[str, list[str]] = {"escola": [], **{tabela: [] for tabela in PREFIXOS_TABELA}}
    for coluna in cabecalho:
        colunas[tabela_da_coluna(coluna)].append(coluna)
    return colunas


def separar_linha(linha: LinhaCenso) -> dict[str, LinhaCenso]:
    """Divide a linha compactada nas mesmas tabelas do layout 2025.

    Exemplo:
        >>> separar_linha({"CO_ENTIDADE": 1, "QT_TUR_BAS": 3})["turma"]
        {'QT_TUR_BAS': 3}
    """
    partes: dict[str, LinhaCenso] = {"escola": {}, **{tabela: {} for tabela in PREFIXOS_TABELA}}
    for coluna, valor in linha.items():
        partes[tabela_da_coluna(coluna)][coluna] = valor
    return partes


def _guardar_linha(censo: CensoRJ, linha: LinhaCenso) -> None:
    partes = separar_linha(linha)
    codigo = int(partes["escola"][CHAVE_ESCOLA])
    censo.escolas[codigo] = partes["escola"]
    for tabela in PREFIXOS_TABELA:
        censo.complementares[tabela][codigo] = partes[tabela]


def carregar_cursos_suplemento(arquivos: SistemaArquivos, caminho: str, colunas_escola: frozenset[str]) -> tuple[dict[int, list[LinhaCenso]], list[str]]:
    """Lê o suplemento de cursos técnicos, descartando as colunas de identificação da escola.

    Exemplo:
        >>> cursos, colunas = carregar_cursos_suplemento(arquivos, "suplemento_cursos_tecnicos_2024.csv", colunas_escola)
    """
    cursos: dict[int, list[LinhaCenso]] = {}
    cabecalho: list[str] = []
    for cabecalho, valores in ler_linhas_rj(arquivos, caminho):
        codigo = int(valores[cabecalho.index(CHAVE_ESCOLA)])
        cursos.setdefault(codigo, []).append(compactar_linha(cabecalho, valores, colunas_escola))
    return cursos, [coluna for coluna in cabecalho if coluna not in colunas_escola]


def carregar_censo_unico(arquivos: SistemaArquivos, caminho_csv: str, caminho_suplemento: str | None) -> CensoRJ:
    """Carrega o recorte RJ de um ano no layout de arquivo único.

    Exemplo:
        >>> censo = carregar_censo_unico(SistemaArquivosLocal(), ".../microdados_ed_basica_2024.csv", None)
        >>> len(censo.escolas)
        13204
    """
    censo = CensoRJ(complementares={tabela: {} for tabela in PREFIXOS_TABELA})
    cabecalho: list[str] = []
    for cabecalho, valores in ler_linhas_rj(arquivos, caminho_csv):
        _guardar_linha(censo, compactar_linha(cabecalho, valores, COLUNAS_REDUNDANTES))
    censo.colunas = separar_colunas(cabecalho)
    censo.colunas["cursos_tecnicos"] = []
    if caminho_suplemento:
        censo.cursos, censo.colunas["cursos_tecnicos"] = carregar_cursos_suplemento(arquivos, caminho_suplemento, frozenset(cabecalho))
    registrar("tabela_lida", tabela="arquivo_unico", linhas=len(censo.escolas))
    return censo
