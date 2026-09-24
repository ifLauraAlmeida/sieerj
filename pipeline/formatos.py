# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Detecção do layout de cada ano extraído e carga uniforme no formato CensoRJ."""

from dataclasses import dataclass

from pipeline.arquivo_unico import carregar_censo_unico
from pipeline.arquivos import SistemaArquivos
from pipeline.tabelas import CensoRJ, carregar_censo

FORMATO_TABELAS = "tabelas"
FORMATO_UNICO = "unico"


@dataclass(frozen=True)
class ArquivosDoAno:
    """Arquivos de um ano extraído: layout detectado, dados principais, suplemento e dicionário."""

    formato: str
    # Tabelas: pasta "dados"; arquivo único: o CSV principal.
    principal: str
    suplemento_cursos: str | None
    dicionario: str


def _unico_ou_nada(encontrados: list[str], descricao: str, diretorio: str) -> str | None:
    if len(encontrados) > 1:
        raise ValueError(f"Mais de um arquivo de {descricao} em {diretorio!r}: {encontrados} (esperado exatamente um)")
    return encontrados[0] if encontrados else None


def localizar_dicionario(arquivos: SistemaArquivos, diretorio: str) -> str:
    """Encontra o dicionário .xlsx do ano, ignorando arquivos temporários do Excel ("~$...").

    Exemplo:
        >>> localizar_dicionario(SistemaArquivosLocal(), "dados/extraidos/2024")
        'dados/extraidos/2024/.../dicionário_dados_educação_básica.xlsx'
    """
    candidatos = [c for c in arquivos.buscar(diretorio, "*anexo i *.xlsx") if "~$" not in c]
    dicionario = _unico_ou_nada(candidatos, "dicionário (.xlsx no ANEXO I)", diretorio)
    if dicionario is None:
        raise FileNotFoundError(f"Dicionário não encontrado em {diretorio!r} (esperado */ANEXO I*/*.xlsx)")
    return dicionario


def localizar_arquivos(arquivos: SistemaArquivos, diretorio: str) -> ArquivosDoAno:
    """Identifica o layout do ano pela presença dos arquivos característicos.

    Exemplo:
        >>> localizar_arquivos(SistemaArquivosLocal(), "dados/extraidos/2024").formato
        'unico'
    """
    dicionario = localizar_dicionario(arquivos, diretorio)
    tabela_escola = _unico_ou_nada(arquivos.buscar(diretorio, "*dados/tabela_escola_*.csv"), "Tabela de Escola", diretorio)
    if tabela_escola:
        return ArquivosDoAno(FORMATO_TABELAS, tabela_escola.rsplit("/", 1)[0], None, dicionario)
    principal = _unico_ou_nada(arquivos.buscar(diretorio, "*dados/microdados_ed_basica_*.csv"), "microdados", diretorio)
    if principal is None:
        raise FileNotFoundError(f"Layout não reconhecido em {diretorio!r} (esperado Tabela_Escola_*.csv ou microdados_ed_basica_*.csv)")
    suplemento = _unico_ou_nada(arquivos.buscar(diretorio, "*dados/suplemento_cursos_tecnicos_*.csv"), "suplemento", diretorio)
    return ArquivosDoAno(FORMATO_UNICO, principal, suplemento, dicionario)


def carregar_ano(arquivos: SistemaArquivos, localizados: ArquivosDoAno) -> CensoRJ:
    """Carrega o recorte RJ do ano, qualquer que seja o layout.

    Exemplo:
        >>> carregar_ano(arquivos, localizar_arquivos(arquivos, "dados/extraidos/2019")).escolas
    """
    if localizados.formato == FORMATO_TABELAS:
        return carregar_censo(arquivos, localizados.principal)
    return carregar_censo_unico(arquivos, localizados.principal, localizados.suplemento_cursos)
