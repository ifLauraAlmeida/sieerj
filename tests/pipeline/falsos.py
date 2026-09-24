# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Fakes em memória para os testes do pipeline: sistema de arquivos e cliente HTTP."""

import fnmatch
import hashlib
from typing import Iterable, Iterator

from pipeline.arquivos import ValorJson
from pipeline.cliente_http import InfoDownload


class SistemaArquivosFalso:
    """Guarda textos, zips (membro → bytes), JSON e JSONL gravados em dicionários."""

    def __init__(self, textos: dict[str, str] | None = None, zips: dict[tuple[str, str], bytes] | None = None) -> None:
        self.textos = textos or {}
        self.zips = zips or {}
        self.gravados: dict[str, ValorJson] = {}
        self.jsonl: dict[str, list[ValorJson]] = {}

    def _todos(self) -> set[str]:
        zips = {caminho for caminho, _ in self.zips}
        return set(self.textos) | set(self.gravados) | set(self.jsonl) | zips

    def existe(self, caminho: str) -> bool:
        return any(item == caminho or item.startswith(f"{caminho}/") for item in self._todos())

    def listar(self, diretorio: str) -> list[str]:
        prefixo = f"{diretorio}/"
        return sorted({item[len(prefixo):].split("/")[0] for item in self._todos() if item.startswith(prefixo)})

    def buscar(self, diretorio: str, padrao: str) -> list[str]:
        prefixo = f"{diretorio}/"
        candidatos = [item for item in self._todos() if item.startswith(prefixo)]
        return sorted(item for item in candidatos if fnmatch.fnmatch(item[len(prefixo):].lower(), padrao.lower()))

    def ler_linhas(self, caminho: str) -> Iterator[str]:
        yield from self.textos[caminho].splitlines(keepends=True)

    def ler_json(self, caminho: str) -> ValorJson:
        return self.gravados[caminho]

    def listar_membros_zip(self, caminho: str) -> list[str]:
        return [membro for origem, membro in self.zips if origem == caminho]

    def ler_membro_zip(self, caminho: str, membro: str) -> bytes:
        return self.zips[(caminho, membro)]

    def extrair_zip(self, caminho: str, destino: str) -> None:
        for membro in self.listar_membros_zip(caminho):
            self.textos[f"{destino}/{membro}"] = self.zips[(caminho, membro)].decode("latin-1")

    def gravar_json(self, caminho: str, conteudo: ValorJson) -> None:
        self.gravados[caminho] = conteudo

    def gravar_jsonl_gz(self, caminho: str, registros: Iterable[ValorJson]) -> None:
        self.jsonl[caminho] = list(registros)

    def ler_jsonl_gz(self, caminho: str) -> Iterator[ValorJson]:
        yield from self.jsonl[caminho]


class ClienteHttpFalso:
    """Responde páginas e arquivos fixos por URL e registra os downloads feitos."""

    def __init__(self, paginas: dict[str, str], arquivos_remotos: dict[str, bytes], destino: SistemaArquivosFalso) -> None:
        self.paginas = paginas
        self.arquivos_remotos = arquivos_remotos
        self.destino = destino
        self.baixados: list[str] = []

    def baixar_texto(self, url: str) -> str:
        return self.paginas[url]

    def baixar_arquivo(self, url: str, caminho: str) -> InfoDownload:
        conteudo = self.arquivos_remotos[url]
        self.baixados.append(url)
        self.destino.zips[(caminho, "_conteudo")] = conteudo
        return InfoDownload(bytes=len(conteudo), sha256=hashlib.sha256(conteudo).hexdigest())
