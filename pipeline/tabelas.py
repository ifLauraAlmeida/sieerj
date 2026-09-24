# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Carga do layout em seis tabelas (Censo 2025 em diante), indexada pelo código INEP da escola."""

from dataclasses import dataclass, field

from pipeline.arquivos import SistemaArquivos
from pipeline.leitor_censo import (
    COLUNAS_REDUNDANTES,
    LinhaCenso,
    compactar_linha,
    ler_linhas_rj,
    localizar_tabela,
)
from pipeline.registro import registrar

CHAVE_ESCOLA = "CO_ENTIDADE"


@dataclass(frozen=True)
class DefinicaoTabela:
    """Tabela do layout 2025: nome interno e padrão do nome do arquivo CSV."""

    nome: str
    padrao_arquivo: str
    # Curso técnico tem uma linha por curso; as demais, uma linha por escola.
    varias_linhas_por_escola: bool = False


TABELA_ESCOLA = DefinicaoTabela("escola", "tabela_escola_*.csv")
TABELAS_COMPLEMENTARES = (
    DefinicaoTabela("matricula", "tabela_matricula_*.csv"),
    DefinicaoTabela("turma", "tabela_turma_*.csv"),
    DefinicaoTabela("docente", "tabela_docente_*.csv"),
    DefinicaoTabela("gestor", "tabela_gestor_escolar_*.csv"),
    DefinicaoTabela("cursos_tecnicos", "tabela_curso_tecnico_*.csv", varias_linhas_por_escola=True),
)


@dataclass
class CensoRJ:
    """Recorte RJ de todas as tabelas de um ano, já compactado.

    `colunas` guarda, por tabela, as colunas publicadas naquele ano: sem isso não dá para
    distinguir "zero" de "variável não coletada" nas séries históricas.
    """

    escolas: dict[int, LinhaCenso] = field(default_factory=dict)
    complementares: dict[str, dict[int, LinhaCenso]] = field(default_factory=dict)
    cursos: dict[int, list[LinhaCenso]] = field(default_factory=dict)
    colunas: dict[str, list[str]] = field(default_factory=dict)


def carregar_escolas(arquivos: SistemaArquivos, diretorio: str) -> tuple[dict[int, LinhaCenso], list[str]]:
    """Lê a Tabela de Escola e devolve as linhas e o cabeçalho.

    As colunas da Tabela de Escola se repetem nas outras tabelas e servem para descartá-las lá.

    Exemplo:
        >>> escolas, cabecalho = carregar_escolas(SistemaArquivosLocal(), "dados")
    """
    caminho = localizar_tabela(arquivos, diretorio, TABELA_ESCOLA.padrao_arquivo)
    escolas: dict[int, LinhaCenso] = {}
    cabecalho: list[str] = []
    for cabecalho, valores in ler_linhas_rj(arquivos, caminho):
        linha = compactar_linha(cabecalho, valores, COLUNAS_REDUNDANTES)
        escolas[int(linha[CHAVE_ESCOLA])] = linha
    registrar("tabela_lida", tabela=TABELA_ESCOLA.nome, linhas=len(escolas))
    return escolas, cabecalho


def carregar_complementar(
    arquivos: SistemaArquivos, diretorio: str, tabela: DefinicaoTabela, colunas_escola: frozenset[str]
) -> tuple[dict[int, list[LinhaCenso]], list[str]]:
    """Lê uma tabela complementar mantendo apenas as colunas próprias dela.

    Exemplo:
        >>> linhas, colunas = carregar_complementar(arquivos, "dados", TABELAS_COMPLEMENTARES[0], colunas_escola)
        >>> linhas[33036594]
        [{'QT_MAT_BAS': 812, ...}]
    """
    caminho = localizar_tabela(arquivos, diretorio, tabela.padrao_arquivo)
    linhas: dict[int, list[LinhaCenso]] = {}
    cabecalho: list[str] = []
    for cabecalho, valores in ler_linhas_rj(arquivos, caminho):
        codigo = int(valores[cabecalho.index(CHAVE_ESCOLA)])
        linhas.setdefault(codigo, []).append(compactar_linha(cabecalho, valores, colunas_escola))
    registrar("tabela_lida", tabela=tabela.nome, escolas=len(linhas))
    return linhas, [coluna for coluna in cabecalho if coluna not in colunas_escola]


def carregar_censo(arquivos: SistemaArquivos, diretorio: str) -> CensoRJ:
    """Carrega o recorte RJ do layout em tabelas a partir da pasta "dados" do ano.

    Exemplo:
        >>> censo = carregar_censo(SistemaArquivosLocal(), "dados/extraidos/2025/.../dados")
        >>> len(censo.escolas)
        13035
    """
    escolas, cabecalho_escola = carregar_escolas(arquivos, diretorio)
    colunas_escola = frozenset(cabecalho_escola)
    censo = CensoRJ(escolas=escolas, colunas={TABELA_ESCOLA.nome: cabecalho_escola})
    for tabela in TABELAS_COMPLEMENTARES:
        linhas, colunas = carregar_complementar(arquivos, diretorio, tabela, colunas_escola)
        censo.colunas[tabela.nome] = colunas
        if tabela.varias_linhas_por_escola:
            censo.cursos = linhas
            continue
        censo.complementares[tabela.nome] = {codigo: grupo[0] for codigo, grupo in linhas.items()}
    return censo
