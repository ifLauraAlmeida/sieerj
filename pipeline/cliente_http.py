# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Cliente HTTP do pipeline, encapsulando urllib e o ajuste de TLS exigido pelo servidor do INEP."""

import hashlib
import os
import ssl
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from http.client import HTTPResponse
from pathlib import Path
from typing import Callable, Protocol, TypeVar

AGENTE = "Mozilla/5.0 (compatible; SIEERJ/1.0; +https://github.com/ifLauraAlmeida/sieerj)"
TAMANHO_BLOCO = 1024 * 1024
TENTATIVAS = 4
ESPERA_INICIAL_S = 2.0

Resultado = TypeVar("Resultado")

# download.inep.gov.br envia só o certificado final, sem o intermediário da RNP/GlobalSign,
# e a verificação falha com "unable to get local issuer certificate" (verificado em 2026-09-24).
# Baixamos o intermediário pelo endereço AIA do próprio certificado e fixamos seu SHA-256:
# como ele vem por HTTP, o pin impede que um certificado forjado vire autoridade confiável.
URL_INTERMEDIARIO_INEP = "http://secure.globalsign.com/cacert/rnpicpedugr46ovtlsca2025.crt"
SHA256_INTERMEDIARIO_INEP = "e10747d4da7bab09cba9952f019d3534cb9fba070bf13d8791b1699cd2ff59dd"


@dataclass(frozen=True)
class InfoDownload:
    """Resultado de um download: tamanho em bytes e SHA-256 do conteúdo."""

    bytes: int
    sha256: str


class ClienteHttp(Protocol):
    """Operações HTTP de que a coleta precisa."""

    def baixar_texto(self, url: str) -> str:
        """Baixa uma página como texto."""
        ...

    def baixar_arquivo(self, url: str, caminho: str) -> InfoDownload:
        """Baixa um arquivo para o caminho local, devolvendo tamanho e SHA-256."""
        ...


def contexto_tls_inep(certificado_der: bytes) -> ssl.SSLContext:
    """Cria contexto TLS padrão acrescido do intermediário do INEP, após conferir o pin.

    Exemplo:
        >>> contexto_tls_inep(urllib.request.urlopen(URL_INTERMEDIARIO_INEP).read())
    """
    obtido = hashlib.sha256(certificado_der).hexdigest()
    if obtido != SHA256_INTERMEDIARIO_INEP:
        raise ssl.SSLError(
            f"Certificado intermediário do INEP com SHA-256 {obtido}; esperado {SHA256_INTERMEDIARIO_INEP}. "
            "Se o INEP renovou o certificado, confira o novo em URL_INTERMEDIARIO_INEP e atualize o pin."
        )
    contexto = ssl.create_default_context()
    contexto.load_verify_locations(cadata=ssl.DER_cert_to_PEM_cert(certificado_der))
    return contexto


def com_tentativas(operacao: Callable[[], Resultado], tentativas: int = TENTATIVAS, espera: float = ESPERA_INICIAL_S) -> Resultado:
    """Repete a operação em falhas de rede, dobrando a espera; o gov.br às vezes reseta conexões.

    Exemplo:
        >>> com_tentativas(lambda: cliente.baixar_texto(URL_PAGINA_MICRODADOS))
    """
    for tentativa in range(1, tentativas + 1):
        try:
            return operacao()
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            if tentativa == tentativas:
                raise
            time.sleep(espera * 2 ** (tentativa - 1))
    raise AssertionError("inalcançável: o laço retorna ou relança a última falha")


class ClienteHttpUrllib:
    """Cliente real sobre urllib; grava downloads em arquivo .parcial e renomeia ao final.

    Exemplo:
        >>> ClienteHttpUrllib().baixar_arquivo("https://download.inep.gov.br/...zip", "dados/brutos/2024/m.zip")
    """

    def __init__(self, tempo_limite: int = 300) -> None:
        self._tempo_limite = tempo_limite
        self._contexto: ssl.SSLContext | None = None

    def _abrir(self, url: str) -> HTTPResponse:
        requisicao = urllib.request.Request(url, headers={"User-Agent": AGENTE})
        resposta: HTTPResponse = urllib.request.urlopen(requisicao, timeout=self._tempo_limite, context=self._contexto_tls())
        return resposta

    def _contexto_tls(self) -> ssl.SSLContext:
        if self._contexto is None:
            with urllib.request.urlopen(URL_INTERMEDIARIO_INEP, timeout=self._tempo_limite) as resposta:
                self._contexto = contexto_tls_inep(resposta.read())
        return self._contexto

    def baixar_texto(self, url: str) -> str:
        """Baixa uma página como texto UTF-8, com novas tentativas em falha de rede.

        Exemplo:
            >>> "microdados_censo_escolar_2024" in ClienteHttpUrllib().baixar_texto(URL_PAGINA_MICRODADOS)
            True
        """
        return com_tentativas(lambda: self._ler_texto(url))

    def baixar_arquivo(self, url: str, caminho: str) -> InfoDownload:
        """Baixa em blocos, com novas tentativas em falha de rede.

        Exemplo:
            >>> ClienteHttpUrllib().baixar_arquivo(url_zip_2024, "dados/brutos/2024/m.zip").bytes
            33829396
        """
        return com_tentativas(lambda: self._gravar_arquivo(url, caminho))

    def _ler_texto(self, url: str) -> str:
        with self._abrir(url) as resposta:
            return resposta.read().decode("utf-8", errors="replace")

    def _gravar_arquivo(self, url: str, caminho: str) -> InfoDownload:
        destino = Path(caminho)
        destino.parent.mkdir(parents=True, exist_ok=True)
        parcial = destino.with_name(destino.name + ".parcial")
        resumo, total = hashlib.sha256(), 0
        with self._abrir(url) as resposta, open(parcial, "wb") as arquivo:
            while bloco := resposta.read(TAMANHO_BLOCO):
                arquivo.write(bloco)
                resumo.update(bloco)
                total += len(bloco)
        os.replace(parcial, destino)
        return InfoDownload(bytes=total, sha256=resumo.hexdigest())
