# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Camada prata: recorte RJ de cada ano, normalizado em fichas por escola.

Saída por ano em dados/processados/<ano>/:
- fichas.jsonl.gz: uma ficha por linha (mesma estrutura em todos os anos);
- dicionario.json: variáveis e categorias do dicionário daquele ano;
- meta.json: ano, layout de origem, número de escolas e colunas publicadas por tabela.
"""

from typing import Iterator, cast

from pipeline.arquivos import SistemaArquivos, ValorJson
from pipeline.dicionario import VariavelDicionario, coletada_no_ano, ler_dicionario
from pipeline.ficha import Ficha, montar_ficha
from pipeline.formatos import carregar_ano, localizar_arquivos
from pipeline.registro import registrar
from pipeline.tabelas import CensoRJ


# Incremente ao mudar o formato ou as regras da camada prata: anos gravados com versão
# diferente são reprocessados; os demais são reaproveitados (reler os CSVs leva ~12 s por ano).
VERSAO_PRATA = 2


def prata_atualizada(arquivos: SistemaArquivos, destino: str) -> bool:
    """Indica se o ano já tem camada prata completa gravada na versão atual.

    Exemplo:
        >>> prata_atualizada(SistemaArquivosLocal(), "dados/processados/2024")
        True
    """
    caminho = f"{destino}/meta.json"
    if not arquivos.existe(caminho):
        return False
    meta = arquivos.ler_json(caminho)
    return isinstance(meta, dict) and meta.get("versao") == VERSAO_PRATA


def processar_ano(arquivos: SistemaArquivos, ano: int, dir_extraido: str, dir_processados: str, forcar: bool = False) -> str:
    """Lê o ano extraído e grava a camada prata; devolve a pasta gerada.

    Pula o ano se a prata já estiver na versão atual, salvo com forcar=True.

    Exemplo:
        >>> processar_ano(SistemaArquivosLocal(), 2024, "dados/extraidos/2024", "dados/processados")
        'dados/processados/2024'
    """
    if not forcar and prata_atualizada(arquivos, f"{dir_processados}/{ano}"):
        registrar("prata_ignorada", ano=ano, motivo="já processada")
        return f"{dir_processados}/{ano}"
    localizados = localizar_arquivos(arquivos, dir_extraido)
    censo = carregar_ano(arquivos, localizados)
    dicionario = ler_dicionario(arquivos, localizados.dicionario)
    destino = f"{dir_processados}/{ano}"
    arquivos.gravar_jsonl_gz(f"{destino}/fichas.jsonl.gz", _fichas_do_censo(censo))
    arquivos.gravar_json(f"{destino}/dicionario.json", cast(ValorJson, dicionario))
    colunas = colunas_coletadas(censo.colunas, dicionario, ano)
    # meta.json por último: é ele que marca a prata do ano como completa.
    meta = {"versao": VERSAO_PRATA, "ano": ano, "formato": localizados.formato, "escolas": len(censo.escolas), "colunas": colunas}
    arquivos.gravar_json(f"{destino}/meta.json", meta)
    registrar("prata_gerada", ano=ano, formato=localizados.formato, escolas=len(censo.escolas))
    return destino


def colunas_coletadas(colunas: dict[str, list[str]], dicionario: dict[str, VariavelDicionario], ano: int) -> dict[str, list[str]]:
    """Colunas publicadas E coletadas no ano: o INEP preenche com 0 variáveis que não existiam
    nos anos republicados (ex.: IN_INTERNET_ALUNOS antes de 2019), o que viraria um falso "não possui".

    Exemplo:
        >>> colunas_coletadas({"escola": ["IN_A"]}, {"IN_A": {"descricao": "", "categorias": {}, "anos_coleta": [2019]}}, 2018)
        {'escola': []}
    """
    return {tabela: [c for c in lista if coletada_no_ano(dicionario.get(c), ano)] for tabela, lista in colunas.items()}


def _fichas_do_censo(censo: CensoRJ) -> Iterator[ValorJson]:
    for codigo in censo.escolas:
        yield cast(ValorJson, montar_ficha(codigo, censo))


def ler_fichas(arquivos: SistemaArquivos, dir_ano: str) -> list[Ficha]:
    """Lê as fichas de um ano da camada prata.

    Exemplo:
        >>> len(ler_fichas(SistemaArquivosLocal(), "dados/processados/2024"))
        13204
    """
    # A camada prata é gravada por este mesmo módulo, então a estrutura é conhecida.
    return [cast(Ficha, registro) for registro in arquivos.ler_jsonl_gz(f"{dir_ano}/fichas.jsonl.gz")]
