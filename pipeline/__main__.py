# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Ponto de entrada do pipeline em camadas.

    python3 -m pipeline tudo --anos 2019-2025
    python3 -m pipeline coletar --anos 2024          # bruta: raspa o site do INEP e baixa o .zip
    python3 -m pipeline extrair --anos 2024          # extraída: descompacta
    python3 -m pipeline processar --anos 2024        # prata: recorte RJ normalizado
    python3 -m pipeline publicar                     # ouro: JSON do site, com todos os anos processados
"""

import argparse
import re

from pipeline.arquivos import SistemaArquivos, SistemaArquivosLocal
from pipeline.cliente_http import ClienteHttpUrllib
from pipeline.coleta import coletar
from pipeline.extracao import extrair_ano
from pipeline.prata import processar_ano
from pipeline.publicacao import publicar

DIR_BRUTOS = "dados/brutos"
DIR_EXTRAIDOS = "dados/extraidos"
DIR_PROCESSADOS = "dados/processados"
DIR_SITE = "site/dados"
ANOS_PADRAO = "2007-2025"
ETAPAS = ("coletar", "extrair", "processar", "publicar", "tudo")


def interpretar_anos(texto: str) -> list[int]:
    """Converte "2019-2021,2025" em [2019, 2020, 2021, 2025].

    Exemplo:
        >>> interpretar_anos("2019-2021,2025")
        [2019, 2020, 2021, 2025]
    """
    anos: set[int] = set()
    for trecho in texto.split(","):
        intervalo = re.fullmatch(r"\s*(\d{4})\s*(?:-\s*(\d{4})\s*)?", trecho)
        if not intervalo:
            raise ValueError(f"Anos inválidos: {trecho!r} (esperado AAAA, AAAA-AAAA ou lista separada por vírgulas)")
        inicio = int(intervalo.group(1))
        anos.update(range(inicio, int(intervalo.group(2) or inicio) + 1))
    return sorted(anos)


def anos_processados(arquivos: SistemaArquivos, dir_processados: str) -> list[int]:
    """Anos que já têm camada prata completa (meta.json é gravado por último).

    Exemplo:
        >>> anos_processados(SistemaArquivosLocal(), "dados/processados")
        [2023, 2024, 2025]
    """
    if not arquivos.existe(dir_processados):
        return []
    nomes = [nome for nome in arquivos.listar(dir_processados) if nome.isdigit()]
    return [int(nome) for nome in nomes if arquivos.existe(f"{dir_processados}/{nome}/meta.json")]


def ler_argumentos() -> argparse.Namespace:
    """Lê a etapa e os anos pedidos na linha de comando.

    Exemplo:
        $ python3 -m pipeline processar --anos 2019-2025 --forcar
    """
    parser = argparse.ArgumentParser(description="Pipeline do SIEERJ: microdados do Censo Escolar (INEP) → site.")
    parser.add_argument("etapa", choices=ETAPAS, help="camada a executar")
    parser.add_argument("--forcar", action="store_true", help="reprocessa a camada prata mesmo se já atualizada")
    parser.add_argument("--anos", default=ANOS_PADRAO, help="ex.: 2025, 2019-2025 ou 2015,2020,2025 (publicar: padrão = todos os processados)")
    return parser.parse_args()


def executar_camadas(etapa: str, anos: list[int], arquivos: SistemaArquivosLocal, forcar: bool = False) -> None:
    """Executa coleta, extração e prata conforme a etapa pedida.

    Exemplo:
        >>> executar_camadas("tudo", [2024, 2025], SistemaArquivosLocal())
    """
    zips: dict[int, str] = {}
    if etapa in ("coletar", "tudo"):
        zips = coletar(ClienteHttpUrllib(), arquivos, anos, DIR_BRUTOS)
    if etapa in ("extrair", "tudo"):
        for ano in anos:
            extrair_ano(arquivos, ano, zips.get(ano) or _zip_existente(arquivos, ano), DIR_EXTRAIDOS)
    if etapa in ("processar", "tudo"):
        for ano in anos:
            processar_ano(arquivos, ano, f"{DIR_EXTRAIDOS}/{ano}", DIR_PROCESSADOS, forcar)


def _zip_existente(arquivos: SistemaArquivosLocal, ano: int) -> str:
    zips = arquivos.buscar(f"{DIR_BRUTOS}/{ano}", "*.zip") if arquivos.existe(f"{DIR_BRUTOS}/{ano}") else []
    if len(zips) != 1:
        raise FileNotFoundError(f"Zip do ano {ano} não encontrado em {DIR_BRUTOS}/{ano} (esperado 1; rode 'coletar' antes)")
    return zips[0]


def main() -> None:
    """Executa a etapa pedida.

    Exemplo:
        $ python3 -m pipeline tudo --anos 2023-2025
    """
    argumentos = ler_argumentos()
    arquivos = SistemaArquivosLocal()
    executar_camadas(argumentos.etapa, interpretar_anos(argumentos.anos), arquivos, argumentos.forcar)
    if argumentos.etapa not in ("publicar", "tudo"):
        return
    anos = anos_processados(arquivos, DIR_PROCESSADOS)
    total = publicar(arquivos, anos, DIR_PROCESSADOS, DIR_SITE)
    print(f"{total} escolas do RJ publicadas em {DIR_SITE} ({len(anos)} anos: {min(anos)}–{max(anos)})")


if __name__ == "__main__":
    main()
