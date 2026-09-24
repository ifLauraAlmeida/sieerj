# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Camada bruta: raspa a página de microdados do INEP e baixa os .zip do Censo Escolar."""

import re
from datetime import datetime, timezone
from html.parser import HTMLParser

from pipeline.arquivos import SistemaArquivos
from pipeline.cliente_http import ClienteHttp
from pipeline.registro import registrar

URL_PAGINA_MICRODADOS = "https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-escolar"
# Ex.: microdados_censo_escolar_2024.zip e microdados_censo_escolar_2025_.zip (o de 2025 tem "_" extra).
_PADRAO_LINK = re.compile(r"microdados_censo_escolar_(\d{4})_?\.zip$")
# Antes de 2007 os zips seguem o layout legado (CENSOESC_AAAA.CSV), ainda não suportado.
PRIMEIRO_ANO_SUPORTADO = 2007


class _ColetorLinks(HTMLParser):
    """Coleta os href de todas as tags <a> da página."""

    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        """Chamado pelo HTMLParser a cada tag de abertura; guarda o href dos links."""
        if tag == "a":
            self.links.extend(valor for nome, valor in attrs if nome == "href" and valor)


def extrair_links_microdados(html: str) -> dict[int, str]:
    """Encontra os links de download por ano na página do INEP.

    Exemplo:
        >>> extrair_links_microdados('<a href="https://x/microdados_censo_escolar_2024.zip">2024</a>')
        {2024: 'https://x/microdados_censo_escolar_2024.zip'}
    """
    coletor = _ColetorLinks()
    coletor.feed(html)
    links: dict[int, str] = {}
    for link in coletor.links:
        encontrado = _PADRAO_LINK.search(link)
        if encontrado:
            links[int(encontrado.group(1))] = link
    return dict(sorted(links.items()))


def selecionar_anos(links: dict[int, str], anos: list[int]) -> dict[int, str]:
    """Filtra os anos pedidos, falhando se algum não estiver publicado ou não for suportado.

    Exemplo:
        >>> selecionar_anos({2024: "u"}, [2024])
        {2024: 'u'}
    """
    antigos = [ano for ano in anos if ano < PRIMEIRO_ANO_SUPORTADO]
    if antigos:
        raise ValueError(f"Anos {antigos} usam layout legado; use anos a partir de {PRIMEIRO_ANO_SUPORTADO}")
    faltando = [ano for ano in anos if ano not in links]
    if faltando:
        raise ValueError(f"Anos {faltando} não encontrados na página do INEP (disponíveis: {min(links)}–{max(links)})")
    return {ano: links[ano] for ano in anos}


def caminho_zip(dir_brutos: str, ano: int, url: str) -> str:
    """Caminho local do zip de um ano, mantendo o nome original do INEP.

    Exemplo:
        >>> caminho_zip("dados/brutos", 2024, "https://x/microdados_censo_escolar_2024.zip")
        'dados/brutos/2024/microdados_censo_escolar_2024.zip'
    """
    return f"{dir_brutos}/{ano}/{url.rsplit('/', 1)[-1]}"


def baixar_ano(cliente: ClienteHttp, arquivos: SistemaArquivos, ano: int, url: str, dir_brutos: str) -> str:
    """Baixa o zip do ano se ainda não existir e registra URL, tamanho e SHA-256 em metadados.json.

    Exemplo:
        >>> baixar_ano(ClienteHttpUrllib(), SistemaArquivosLocal(), 2024, url, "dados/brutos")
        'dados/brutos/2024/microdados_censo_escolar_2024.zip'
    """
    destino = caminho_zip(dir_brutos, ano, url)
    if arquivos.existe(destino):
        registrar("download_ignorado", ano=ano, motivo="já existe")
        return destino
    registrar("download_iniciado", ano=ano, url=url)
    info = cliente.baixar_arquivo(url, destino)
    metadados = {"ano": ano, "url": url, "bytes": info.bytes, "sha256": info.sha256, "baixado_em": datetime.now(timezone.utc).isoformat()}
    arquivos.gravar_json(f"{dir_brutos}/{ano}/metadados.json", metadados)
    registrar("download_concluido", ano=ano, bytes=info.bytes)
    return destino


def coletar(cliente: ClienteHttp, arquivos: SistemaArquivos, anos: list[int], dir_brutos: str) -> dict[int, str]:
    """Raspa a página do INEP e baixa os anos pedidos; devolve {ano: caminho do zip}.

    Exemplo:
        >>> coletar(ClienteHttpUrllib(), SistemaArquivosLocal(), [2023, 2024], "dados/brutos")
    """
    links = selecionar_anos(extrair_links_microdados(cliente.baixar_texto(URL_PAGINA_MICRODADOS)), anos)
    return {ano: baixar_ano(cliente, arquivos, ano, url, dir_brutos) for ano, url in links.items()}
