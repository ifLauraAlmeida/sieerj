# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Interface de acesso ao sistema de arquivos usada pelo pipeline.

Isolar o I/O aqui permite que os testes usem uma fonte falsa em memória.
"""

import fnmatch
import gzip
import json
import zipfile
from pathlib import Path
from typing import Iterable, Iterator, Protocol

ValorJson = int | float | str | bool | None | list["ValorJson"] | dict[str, "ValorJson"]


class SistemaArquivos(Protocol):
    """Operações de leitura e escrita de que o pipeline precisa."""

    def existe(self, caminho: str) -> bool:
        """Indica se o arquivo ou diretório existe."""
        ...

    def listar(self, diretorio: str) -> list[str]:
        """Lista os nomes das entradas de um diretório."""
        ...

    def buscar(self, diretorio: str, padrao: str) -> list[str]:
        """Busca arquivos recursivamente por padrão fnmatch (sem diferenciar maiúsculas)."""
        ...

    def ler_linhas(self, caminho: str) -> Iterator[str]:
        """Itera as linhas de um CSV do INEP."""
        ...

    def ler_json(self, caminho: str) -> ValorJson:
        """Lê um arquivo JSON."""
        ...

    def listar_membros_zip(self, caminho: str) -> list[str]:
        """Lista os arquivos internos de um zip."""
        ...

    def ler_membro_zip(self, caminho: str, membro: str) -> bytes:
        """Lê um arquivo interno de um zip."""
        ...

    def extrair_zip(self, caminho: str, destino: str) -> None:
        """Extrai um zip inteiro no destino."""
        ...

    def gravar_json(self, caminho: str, conteudo: ValorJson) -> None:
        """Grava um JSON, criando diretórios quando preciso."""
        ...

    def gravar_jsonl_gz(self, caminho: str, registros: Iterable[ValorJson]) -> None:
        """Grava um registro JSON por linha, comprimido com gzip."""
        ...

    def ler_jsonl_gz(self, caminho: str) -> Iterator[ValorJson]:
        """Itera os registros de um JSONL comprimido."""
        ...


class SistemaArquivosLocal:
    """Implementação real sobre o disco local.

    Exemplo:
        >>> arquivos = SistemaArquivosLocal()
        >>> arquivos.gravar_json("/tmp/x.json", {"a": 1})
    """

    # Os CSVs do INEP são distribuídos em ISO-8859-1 (verificado com `file` nos microdados 2007–2025).
    CODIFICACAO_CSV = "latin-1"

    def existe(self, caminho: str) -> bool:
        """Indica se o arquivo ou diretório existe.

        Exemplo:
            >>> SistemaArquivosLocal().existe("dados/brutos/2024")
            True
        """
        return Path(caminho).exists()

    def listar(self, diretorio: str) -> list[str]:
        """Lista os nomes de arquivo de um diretório, ordenados.

        Exemplo:
            >>> SistemaArquivosLocal().listar("dados/processados")
            ['2007', '2008', ...]
        """
        return sorted(p.name for p in Path(diretorio).iterdir())

    def buscar(self, diretorio: str, padrao: str) -> list[str]:
        """Busca recursiva por padrão fnmatch aplicado ao caminho relativo, sem diferenciar maiúsculas.

        Exemplo:
            >>> SistemaArquivosLocal().buscar("dados/extraidos/2024", "*dados/microdados_ed_basica_*.csv")
        """
        raiz = Path(diretorio)
        caminhos = (p for p in raiz.rglob("*") if p.is_file())
        return sorted(str(p) for p in caminhos if fnmatch.fnmatch(str(p.relative_to(raiz)).lower(), padrao.lower()))

    def ler_linhas(self, caminho: str) -> Iterator[str]:
        """Itera as linhas de um CSV do INEP sem carregar o arquivo inteiro.

        Exemplo:
            >>> next(SistemaArquivosLocal().ler_linhas("microdados_ed_basica_2024.csv"))[:12]
            'NU_ANO_CENSO'
        """
        with open(caminho, encoding=self.CODIFICACAO_CSV, newline="") as arquivo:
            yield from arquivo

    def ler_json(self, caminho: str) -> ValorJson:
        """Lê um arquivo JSON em UTF-8.

        Exemplo:
            >>> SistemaArquivosLocal().ler_json("site/dados/anos.json")["mais_recente"]
            2025
        """
        return json.loads(Path(caminho).read_text(encoding="utf-8"))

    def listar_membros_zip(self, caminho: str) -> list[str]:
        """Lista os arquivos internos de um zip.

        Exemplo:
            >>> SistemaArquivosLocal().listar_membros_zip("dicionario.xlsx")[:1]
            ['[Content_Types].xml']
        """
        with zipfile.ZipFile(caminho) as pacote:
            return pacote.namelist()

    def ler_membro_zip(self, caminho: str, membro: str) -> bytes:
        """Lê um arquivo interno de um pacote zip (o .xlsx é um zip de XMLs).

        Exemplo:
            >>> SistemaArquivosLocal().ler_membro_zip("dicionario.xlsx", "xl/sharedStrings.xml")[:5]
            b'<?xml'
        """
        with zipfile.ZipFile(caminho) as pacote:
            return pacote.read(membro)

    def extrair_zip(self, caminho: str, destino: str) -> None:
        """Extrai o zip inteiro; zipfile já neutraliza caminhos absolutos e "..".

        Exemplo:
            >>> SistemaArquivosLocal().extrair_zip("dados/brutos/2024/m.zip", "dados/extraidos/2024")
        """
        Path(destino).mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(caminho) as pacote:
            pacote.extractall(destino)

    def gravar_json(self, caminho: str, conteudo: ValorJson) -> None:
        """Grava JSON compacto em UTF-8, criando diretórios quando preciso.

        Exemplo:
            >>> SistemaArquivosLocal().gravar_json("/tmp/x.json", {"a": 1})
        """
        destino = Path(caminho)
        destino.parent.mkdir(parents=True, exist_ok=True)
        texto = json.dumps(conteudo, ensure_ascii=False, separators=(",", ":"))
        destino.write_text(texto, encoding="utf-8")

    def gravar_jsonl_gz(self, caminho: str, registros: Iterable[ValorJson]) -> None:
        """Grava um registro JSON por linha, comprimido com gzip.

        Exemplo:
            >>> SistemaArquivosLocal().gravar_jsonl_gz("/tmp/f.jsonl.gz", [{"a": 1}])
        """
        destino = Path(caminho)
        destino.parent.mkdir(parents=True, exist_ok=True)
        with gzip.open(destino, "wt", encoding="utf-8") as arquivo:
            for registro in registros:
                arquivo.write(json.dumps(registro, ensure_ascii=False, separators=(",", ":")) + "\n")

    def ler_jsonl_gz(self, caminho: str) -> Iterator[ValorJson]:
        """Itera os registros de um arquivo gravado por gravar_jsonl_gz.

        Exemplo:
            >>> next(SistemaArquivosLocal().ler_jsonl_gz("dados/processados/2024/fichas.jsonl.gz"))["escola"]["NO_ENTIDADE"]
        """
        with gzip.open(caminho, "rt", encoding="utf-8") as arquivo:
            for linha in arquivo:
                yield json.loads(linha)
