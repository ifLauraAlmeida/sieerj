# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Camada ouro: junta os anos da camada prata e grava os JSON consumidos pelo site.

Saída em site/dados/:
- anos.json: anos publicados, o mais recente e o número de lotes de fichas;
- panoramas/<ano>.json: estado e municípios em cada ano;
- series.json: métricas ano a ano do estado e de cada município;
- escolas/<lote>.json: ficha do último ano em que cada escola aparece + sua série histórica;
- indice.json, dicionario.json, indicadores.json.
"""

from dataclasses import dataclass, field
from typing import cast

from pipeline.arquivos import SistemaArquivos, ValorJson
from pipeline.cursos import ranking_cursos
from pipeline.dicionario import VariavelDicionario
from pipeline.ficha import COLUNAS_INDICE, Ficha, linha_indice
from pipeline.indicadores import METRICAS_SERIE, exportar_indicadores
from pipeline.panorama import agregar
from pipeline.prata import ler_fichas
from pipeline.registro import registrar
from pipeline.series import ColunasPresentes, ValorSerie, colunas_presentes, valores_agregados, valores_escola

# Fichas agrupadas em lotes: 13 mil arquivos pequenos tornam o upload para hospedagens
# estáticas (Netlify, Pages) muito lento. 256 lotes dão ~80 escolas por arquivo.
LOTES_FICHAS = 256
METRICA_ESCOLAS_ATIVAS = "ESCOLAS_ATIVAS"


@dataclass
class EscolaPublicada:
    """Ficha do último ano em que a escola aparece e sua série anual de métricas."""

    ano: int
    ficha: Ficha
    anos: list[int] = field(default_factory=list)
    valores: list[list[int | None]] = field(default_factory=list)


@dataclass
class HistoricoRJ:
    """Acumula, ano a ano, o que a camada ouro publica."""

    anos: list[int] = field(default_factory=list)
    escolas: dict[int, EscolaPublicada] = field(default_factory=dict)
    estado: dict[int, list[ValorSerie]] = field(default_factory=dict)
    municipios: dict[str, dict[int, list[ValorSerie]]] = field(default_factory=dict)
    nomes_municipios: dict[str, str] = field(default_factory=dict)
    dicionario: dict[str, VariavelDicionario] = field(default_factory=dict)


def lote_da_escola(codigo: int, total_lotes: int = LOTES_FICHAS) -> int:
    """Número do lote que guarda a ficha; o site repete esta conta em js/dados.js.

    Exemplo:
        >>> lote_da_escola(33036594)
        50
    """
    return codigo % total_lotes


def agrupar_por_municipio(fichas: list[Ficha]) -> dict[int, list[Ficha]]:
    """Separa as fichas pelo código IBGE do município.

    Exemplo:
        >>> list(agrupar_por_municipio(fichas))[:1]
        [3300100]
    """
    grupos: dict[int, list[Ficha]] = {}
    for ficha in fichas:
        codigo = int(ficha["escola"]["CO_MUNICIPIO"])
        grupos.setdefault(codigo, []).append(ficha)
    return grupos


def montar_panorama(fichas: list[Ficha], ano: int) -> dict[str, object]:
    """Agrega o estado e cada município de um ano, com o ranking de cursos técnicos.

    Exemplo:
        >>> montar_panorama(fichas, 2025)["estado"]["escolas"]
        13035
    """
    municipios: dict[str, object] = {}
    for codigo, grupo in sorted(agrupar_por_municipio(fichas).items()):
        nome = grupo[0]["escola"]["NO_MUNICIPIO"]
        municipios[str(codigo)] = {"nome": nome, **agregar(grupo), "cursos": ranking_cursos(grupo)}
    estado = {"nome": "Rio de Janeiro", **agregar(fichas), "cursos": ranking_cursos(fichas)}
    return {"ano": ano, "estado": estado, "municipios": municipios}


def registrar_escolas(historico: HistoricoRJ, ano: int, fichas: list[Ficha], presentes: ColunasPresentes) -> None:
    """Atualiza a ficha mais recente e a série de cada escola com o ano lido (anos em ordem crescente).

    Exemplo:
        >>> registrar_escolas(historico, 2024, fichas_2024, presentes_2024)
    """
    for ficha in fichas:
        codigo = int(ficha["escola"]["CO_ENTIDADE"])
        escola = historico.escolas.setdefault(codigo, EscolaPublicada(ano, ficha))
        escola.ano, escola.ficha = ano, ficha
        escola.anos.append(ano)
        escola.valores.append(valores_escola(ficha, presentes))


def registrar_agregados(historico: HistoricoRJ, ano: int, fichas: list[Ficha], presentes: ColunasPresentes) -> None:
    """Calcula a linha agregada do ano para o estado e para cada município.

    Exemplo:
        >>> registrar_agregados(historico, 2024, fichas_2024, presentes_2024)
    """
    historico.estado[ano] = valores_agregados(fichas, presentes)
    for codigo, grupo in agrupar_por_municipio(fichas).items():
        historico.municipios.setdefault(str(codigo), {})[ano] = valores_agregados(grupo, presentes)
        historico.nomes_municipios[str(codigo)] = str(grupo[-1]["escola"]["NO_MUNICIPIO"])


def processar_ano_publicacao(arquivos: SistemaArquivos, historico: HistoricoRJ, ano: int, dir_processados: str, destino: str) -> None:
    """Lê um ano da prata, grava seu panorama e acumula séries, fichas e dicionário.

    Exemplo:
        >>> processar_ano_publicacao(arquivos, historico, 2024, "dados/processados", "site/dados")
    """
    dir_ano = f"{dir_processados}/{ano}"
    fichas = ler_fichas(arquivos, dir_ano)
    meta = cast(dict[str, dict[str, list[str]]], arquivos.ler_json(f"{dir_ano}/meta.json"))
    presentes = colunas_presentes(meta["colunas"])
    arquivos.gravar_json(f"{destino}/panoramas/{ano}.json", cast(ValorJson, montar_panorama(fichas, ano)))
    registrar_escolas(historico, ano, fichas, presentes)
    registrar_agregados(historico, ano, fichas, presentes)
    # Anos em ordem crescente: o dicionário mais novo sobrescreve rótulos antigos.
    historico.dicionario.update(cast(dict[str, VariavelDicionario], arquivos.ler_json(f"{dir_ano}/dicionario.json")))
    historico.anos.append(ano)
    registrar("ano_publicado", ano=ano, escolas=len(fichas))


def montar_lotes(historico: HistoricoRJ, total_lotes: int = LOTES_FICHAS) -> dict[int, dict[str, object]]:
    """Distribui as escolas em lotes: {lote: {código: {ano, ficha, serie}}}.

    Exemplo:
        >>> montar_lotes(historico)[50]["33036594"]["ano"]
        2025
    """
    lotes: dict[int, dict[str, object]] = {}
    for codigo, escola in historico.escolas.items():
        serie = {"anos": escola.anos, "valores": escola.valores}
        lotes.setdefault(lote_da_escola(codigo, total_lotes), {})[str(codigo)] = {"ano": escola.ano, "ficha": escola.ficha, "serie": serie}
    return lotes


def montar_indice(historico: HistoricoRJ) -> dict[str, object]:
    """Índice de busca com a situação mais recente de cada escola e o último ano em que aparece.

    Exemplo:
        >>> montar_indice(historico)["colunas"][-1]
        'ano'
    """
    linhas = [[*linha_indice(escola.ficha), escola.ano] for escola in historico.escolas.values()]
    linhas.sort(key=lambda linha: str(linha[1]))
    return {"colunas": [*COLUNAS_INDICE, "ano"], "linhas": linhas, "municipios": historico.nomes_municipios}


def montar_series(historico: HistoricoRJ) -> dict[str, object]:
    """Séries do estado e dos municípios, alinhadas aos anos (null quando o município não existia).

    Exemplo:
        >>> montar_series(historico)["metricas"][0]
        'ESCOLAS_ATIVAS'
    """
    municipios = {
        codigo: {"nome": historico.nomes_municipios[codigo], "valores": alinhar_anos(historico.anos, por_ano)}
        for codigo, por_ano in sorted(historico.municipios.items())
    }
    metricas = [METRICA_ESCOLAS_ATIVAS, *(metrica["id"] for metrica in METRICAS_SERIE)]
    estado = alinhar_anos(historico.anos, historico.estado)
    return {"anos": historico.anos, "metricas": metricas, "estado": estado, "municipios": municipios}


def alinhar_anos(anos: list[int], por_ano: dict[int, list[ValorSerie]]) -> list[list[ValorSerie] | None]:
    """Ordena as linhas pelos anos publicados, com None onde faltar o ano.

    Exemplo:
        >>> alinhar_anos([2023, 2024], {2024: [1]})
        [None, [1]]
    """
    return [por_ano.get(ano) for ano in anos]


def gravar_consolidados(arquivos: SistemaArquivos, historico: HistoricoRJ, destino: str) -> None:
    """Grava os arquivos que dependem de todos os anos.

    Exemplo:
        >>> gravar_consolidados(arquivos, historico, "site/dados")
    """
    for lote, escolas in montar_lotes(historico).items():
        arquivos.gravar_json(f"{destino}/escolas/{lote}.json", cast(ValorJson, escolas))
    arquivos.gravar_json(f"{destino}/indice.json", cast(ValorJson, montar_indice(historico)))
    arquivos.gravar_json(f"{destino}/series.json", cast(ValorJson, montar_series(historico)))
    arquivos.gravar_json(f"{destino}/dicionario.json", cast(ValorJson, historico.dicionario))
    arquivos.gravar_json(f"{destino}/indicadores.json", cast(ValorJson, exportar_indicadores()))
    anos = {"anos": historico.anos, "mais_recente": max(historico.anos), "lotes_fichas": LOTES_FICHAS}
    arquivos.gravar_json(f"{destino}/anos.json", cast(ValorJson, anos))


def publicar(arquivos: SistemaArquivos, anos: list[int], dir_processados: str, destino: str) -> int:
    """Gera toda a camada ouro a partir dos anos já processados; devolve o total de escolas.

    Exemplo:
        >>> publicar(SistemaArquivosLocal(), [2023, 2024, 2025], "dados/processados", "site/dados")
        14120
    """
    if not anos:
        raise ValueError("Nenhum ano para publicar (esperado ao menos um ano processado, ex.: [2025])")
    historico = HistoricoRJ()
    for ano in sorted(anos):
        processar_ano_publicacao(arquivos, historico, ano, dir_processados, destino)
    gravar_consolidados(arquivos, historico, destino)
    registrar("site_gerado", destino=destino, escolas=len(historico.escolas), anos=len(historico.anos))
    return len(historico.escolas)
