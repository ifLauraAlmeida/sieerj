# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Leitura do dicionário de dados do INEP (.xlsx) usando apenas a biblioteca padrão.

O .xlsx é um zip de XMLs; as colunas relevantes de cada planilha são
B (nome da variável), C (descrição), F (categorias) e, a partir de G, a matriz
"Coleta por ano": uma coluna por ano ("07", "08", …) com "s" quando a variável foi coletada.
"""

import re
import xml.etree.ElementTree as ET
from typing import Iterator, TypedDict

from pipeline.arquivos import SistemaArquivos
from pipeline.categorias import interpretar_categorias

_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
_NOME_VARIAVEL = re.compile(r"^[A-Z][A-Z0-9_]+$")
_COLUNAS = {"B": "nome", "C": "descricao", "F": "categoria"}
# Cabeçalho da matriz de coleta: anos com dois dígitos ("07" = 2007).
_ANO_DOIS_DIGITOS = re.compile(r"^\d{2}$")
# Os anos republicados preenchem com 0 variáveis não coletadas; "s" é o único sinal de coleta.
_MARCA_COLETADA = "s"
_PRIMEIRA_COLUNA_ANO = "G"


class VariavelDicionario(TypedDict):
    """Uma variável do dicionário: descrição, rótulos das categorias e anos em que foi coletada."""

    descricao: str
    categorias: dict[str, str]
    # Vazio quando o dicionário não traz a matriz de coleta (tratado como "sempre coletada").
    anos_coleta: list[int]


def ler_textos_compartilhados(xml: bytes) -> list[str]:
    """Extrai a tabela de textos compartilhados (sharedStrings.xml) do xlsx.

    Exemplo:
        >>> ler_textos_compartilhados(b'<sst xmlns="..."><si><t>A</t></si></sst>')
    """
    raiz = ET.fromstring(xml)
    return ["".join(item.itertext()) for item in raiz.iter(f"{_NS}si")]


def _valor_celula(celula: ET.Element, textos: list[str]) -> str:
    valor = celula.find(f"{_NS}v")
    if valor is None or valor.text is None:
        return ""
    if celula.get("t") == "s":
        return textos[int(valor.text)]
    return valor.text


def _linhas_planilha(xml: bytes, textos: list[str]) -> Iterator[dict[str, str]]:
    """Cada linha como {letra da coluna: texto}."""
    for linha in ET.fromstring(xml).iter(f"{_NS}row"):
        yield {re.sub(r"\d", "", celula.get("r", "")): _valor_celula(celula, textos) for celula in linha.iter(f"{_NS}c")}


def colunas_de_ano(linha: dict[str, str]) -> dict[str, int]:
    """Reconhece a linha de cabeçalho da matriz de coleta e mapeia letra → ano.

    Exemplo:
        >>> colunas_de_ano({"B": "", "G": "07", "H": "08"})
        {'G': 2007, 'H': 2008}
    """
    # Só a partir de G: A (número da variável) e E (tamanho) também têm dois dígitos.
    candidatas = {coluna: valor for coluna, valor in linha.items() if (len(coluna), coluna) >= (1, _PRIMEIRA_COLUNA_ANO)}
    anos = {coluna: 2000 + int(valor) for coluna, valor in candidatas.items() if _ANO_DOIS_DIGITOS.match(valor.strip())}
    return anos if len(anos) >= 2 else {}


def anos_coletados(linha: dict[str, str], colunas_ano: dict[str, int]) -> list[int]:
    """Anos marcados com "s" na matriz de coleta da variável.

    Exemplo:
        >>> anos_coletados({"G": "n", "H": "s"}, {"G": 2007, "H": 2008})
        [2008]
    """
    return sorted(ano for coluna, ano in colunas_ano.items() if linha.get(coluna, "").strip().lower() == _MARCA_COLETADA)


def limpar_descricao(texto: str) -> str:
    """Remove espaços e barras soltas que o INEP deixa no fim das descrições.

    Exemplo:
        >>> limpar_descricao("Número de Matrículas da Educação Básica /  ")
        'Número de Matrículas da Educação Básica'
    """
    return re.sub(r"[\s/]+$", "", " ".join(texto.split()))


def ler_variaveis_planilha(xml: bytes, textos: list[str]) -> dict[str, VariavelDicionario]:
    """Converte uma planilha do dicionário em {variável: descrição e categorias}.

    Exemplo:
        >>> ler_variaveis_planilha(xml_planilha, textos)["TP_LOCALIZACAO"]["categorias"]
        {'1': 'Urbana', '2': 'Rural'}
    """
    variaveis: dict[str, VariavelDicionario] = {}
    colunas_ano: dict[str, int] = {}
    for linha in _linhas_planilha(xml, textos):
        colunas_ano = colunas_de_ano(linha) or colunas_ano
        nome = linha.get("B", "").strip()
        if not _NOME_VARIAVEL.match(nome):
            continue
        variaveis[nome] = {
            "descricao": limpar_descricao(linha.get("C", "")),
            "categorias": interpretar_categorias(linha.get("F", "")),
            "anos_coleta": anos_coletados(linha, colunas_ano),
        }
    return variaveis


def coletada_no_ano(variavel: VariavelDicionario | None, ano: int) -> bool:
    """Indica se a variável foi coletada no ano; sem matriz de coleta, assume que sim.

    Exemplo:
        >>> coletada_no_ano({"descricao": "", "categorias": {}, "anos_coleta": [2019]}, 2018)
        False
    """
    if variavel is None or not variavel["anos_coleta"]:
        return True
    return ano in variavel["anos_coleta"]


def ler_dicionario(arquivos: SistemaArquivos, caminho_xlsx: str) -> dict[str, VariavelDicionario]:
    """Lê todas as planilhas do dicionário e junta as variáveis num único mapa.

    Exemplo:
        >>> dicionario = ler_dicionario(SistemaArquivosLocal(), "dicionário.xlsx")
        >>> dicionario["TP_DEPENDENCIA"]["categorias"]["2"]
        'Estadual'
    """
    textos = ler_textos_compartilhados(arquivos.ler_membro_zip(caminho_xlsx, "xl/sharedStrings.xml"))
    variaveis: dict[str, VariavelDicionario] = {}
    # O número de planilhas varia por ano (1 em 2007–2023, 2 em 2024, 6 em 2025).
    for planilha in planilhas_do_xlsx(arquivos.listar_membros_zip(caminho_xlsx)):
        # A primeira planilha a definir a variável vence: a Tabela de Escola vem antes.
        for nome, variavel in ler_variaveis_planilha(arquivos.ler_membro_zip(caminho_xlsx, planilha), textos).items():
            variaveis.setdefault(nome, variavel)
    return variaveis


def planilhas_do_xlsx(membros: list[str]) -> list[str]:
    """Seleciona as planilhas do xlsx em ordem numérica (sheet2 antes de sheet10).

    Exemplo:
        >>> planilhas_do_xlsx(["xl/worksheets/sheet10.xml", "xl/worksheets/sheet2.xml", "xl/styles.xml"])
        ['xl/worksheets/sheet2.xml', 'xl/worksheets/sheet10.xml']
    """
    planilhas = [membro for membro in membros if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", membro)]
    return sorted(planilhas, key=lambda membro: int(re.sub(r"\D", "", membro)))
