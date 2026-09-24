# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Camada extraída: descompacta o zip bruto de cada ano."""

from datetime import datetime, timezone

from pipeline.arquivos import SistemaArquivos
from pipeline.registro import registrar

# Gravado só depois da extração completa: extração interrompida é refeita na próxima execução.
MARCADOR_EXTRACAO = ".extracao.json"


def extrair_ano(arquivos: SistemaArquivos, ano: int, caminho_zip: str, dir_extraidos: str) -> str:
    """Descompacta o zip do ano em dir_extraidos/<ano>, uma única vez.

    Exemplo:
        >>> extrair_ano(SistemaArquivosLocal(), 2024, "dados/brutos/2024/m.zip", "dados/extraidos")
        'dados/extraidos/2024'
    """
    destino = f"{dir_extraidos}/{ano}"
    marcador = f"{destino}/{MARCADOR_EXTRACAO}"
    if arquivos.existe(marcador):
        registrar("extracao_ignorada", ano=ano, motivo="já extraído")
        return destino
    arquivos.extrair_zip(caminho_zip, destino)
    arquivos.gravar_json(marcador, {"ano": ano, "origem": caminho_zip, "extraido_em": datetime.now(timezone.utc).isoformat()})
    registrar("extracao_concluida", ano=ano, destino=destino)
    return destino
