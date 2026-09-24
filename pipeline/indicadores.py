# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""Definição única dos indicadores exibidos no site.

O pipeline usa estas definições para agregar e também as publica em
indicadores.json, para que o site rotule os gráficos da mesma forma.
"""

from typing import TypedDict


class GrupoSoma(TypedDict):
    """Grupo de quantidades somadas (ex.: matrículas por etapa), exibido como barras."""

    id: str
    titulo: str
    tabela: str
    itens: list[tuple[str, str]]
    nota: str


class IndicadorInfra(TypedDict):
    """Item de infraestrutura: a escola atende quando a coluna tem o valor indicado."""

    rotulo: str
    coluna: str
    valor: int


def _grupo(id_: str, titulo: str, tabela: str, itens: list[tuple[str, str]], nota: str = "") -> GrupoSoma:
    return {"id": id_, "titulo": titulo, "tabela": tabela, "itens": itens, "nota": nota}


TOTAIS: list[tuple[str, str, str]] = [
    ("matriculas", "matricula", "QT_MAT_BAS"),
    ("turmas", "turma", "QT_TUR_BAS"),
    ("docentes", "docente", "QT_DOC_BAS"),
    ("gestores", "gestor", "QT_GEST_BAS"),
]

COLUNA_SITUACAO = "TP_SITUACAO_FUNCIONAMENTO"
# Contadas apenas entre escolas em atividade, para não misturar escolas extintas na composição da rede.
CATEGORIAS_CONTADAS: list[str] = [
    "TP_DEPENDENCIA",
    "TP_LOCALIZACAO",
    "TP_LOCALIZACAO_DIFERENCIADA",
    "TP_CATEGORIA_ESCOLA_PRIVADA",
]

# Situação 1 = "Em Atividade" no dicionário; só essas escolas entram nos percentuais de infraestrutura.
SITUACAO_EM_ATIVIDADE = 1

ETAPAS: dict[str, tuple[str, list[str]]] = {
    "CRE": ("Creche", ["IN_COMUM_CRECHE", "IN_ESP_EXCLUSIVA_CRECHE"]),
    "PRE": ("Pré-escola", ["IN_COMUM_PRE", "IN_ESP_EXCLUSIVA_PRE"]),
    "EFI": ("Fundamental – anos iniciais", ["IN_COMUM_FUND_AI", "IN_ESP_EXCLUSIVA_FUND_AI"]),
    "EFF": ("Fundamental – anos finais", ["IN_COMUM_FUND_AF", "IN_ESP_EXCLUSIVA_FUND_AF"]),
    "MED": (
        "Ensino médio",
        ["IN_COMUM_MEDIO_MEDIO", "IN_COMUM_MEDIO_INTEGRADO", "IN_COMUM_MEDIO_NORMAL", "IN_ESP_EXCLUSIVA_MEDIO_MEDIO"],
    ),
    "EJA": ("EJA", ["IN_EJA"]),
    "PRO": ("Educação profissional", ["IN_PROFISSIONALIZANTE"]),
    "ESP": ("Educação especial exclusiva", ["IN_ESPECIAL_EXCLUSIVA"]),
}

INFRAESTRUTURA: list[IndicadorInfra] = [
    {"rotulo": "Internet", "coluna": "IN_INTERNET", "valor": 1},
    {"rotulo": "Internet para alunos", "coluna": "IN_INTERNET_ALUNOS", "valor": 1},
    {"rotulo": "Banda larga", "coluna": "IN_BANDA_LARGA", "valor": 1},
    {"rotulo": "Biblioteca ou sala de leitura", "coluna": "IN_BIBLIOTECA_SALA_LEITURA", "valor": 1},
    {"rotulo": "Laboratório de informática", "coluna": "IN_LABORATORIO_INFORMATICA", "valor": 1},
    {"rotulo": "Laboratório de ciências", "coluna": "IN_LABORATORIO_CIENCIAS", "valor": 1},
    {"rotulo": "Quadra de esportes", "coluna": "IN_QUADRA_ESPORTES", "valor": 1},
    {"rotulo": "Refeitório", "coluna": "IN_REFEITORIO", "valor": 1},
    {"rotulo": "Banheiro acessível (PNE)", "coluna": "IN_BANHEIRO_PNE", "valor": 1},
    # O Censo pergunta pela ausência de recursos; valor 0 significa que há algum recurso.
    {"rotulo": "Algum recurso de acessibilidade", "coluna": "IN_ACESSIBILIDADE_INEXISTENTE", "valor": 0},
    {"rotulo": "Água potável", "coluna": "IN_AGUA_POTAVEL", "valor": 1},
    {"rotulo": "Esgoto na rede pública", "coluna": "IN_ESGOTO_REDE_PUBLICA", "valor": 1},
    {"rotulo": "Coleta de lixo", "coluna": "IN_LIXO_SERVICO_COLETA", "valor": 1},
    {"rotulo": "Alimentação escolar", "coluna": "IN_ALIMENTACAO", "valor": 1},
]

GRUPOS: list[GrupoSoma] = [
    _grupo(
        "mat_etapa",
        "Matrículas por etapa",
        "matricula",
        [
            ("Creche", "QT_MAT_INF_CRE"),
            ("Pré-escola", "QT_MAT_INF_PRE"),
            ("Fundamental – anos iniciais", "QT_MAT_FUND_AI"),
            ("Fundamental – anos finais", "QT_MAT_FUND_AF"),
            ("Ensino médio", "QT_MAT_MED"),
            ("Educação profissional", "QT_MAT_PROF"),
            ("EJA", "QT_MAT_EJA"),
            ("Educação especial", "QT_MAT_ESP"),
        ],
        "Educação profissional e especial se sobrepõem às demais etapas.",
    ),
    _grupo(
        "mat_turno",
        "Matrículas por turno",
        "matricula",
        [("Diurno", "QT_MAT_BAS_D"), ("Noturno", "QT_MAT_BAS_N"), ("EAD/semipresencial", "QT_MAT_BAS_EAD")],
    ),
    _grupo(
        "mat_cor",
        "Matrículas por cor/raça",
        "matricula",
        [
            ("Branca", "QT_MAT_BAS_BRANCA"),
            ("Preta", "QT_MAT_BAS_PRETA"),
            ("Parda", "QT_MAT_BAS_PARDA"),
            ("Amarela", "QT_MAT_BAS_AMARELA"),
            ("Indígena", "QT_MAT_BAS_INDIGENA"),
            ("Não declarada", "QT_MAT_BAS_ND"),
        ],
    ),
    _grupo("mat_sexo", "Matrículas por sexo", "matricula", [("Feminino", "QT_MAT_BAS_FEM"), ("Masculino", "QT_MAT_BAS_MASC")]),
    _grupo(
        "mat_idade",
        "Matrículas por faixa etária",
        "matricula",
        [
            ("Até 3 anos", "QT_MAT_BAS_0_3"),
            ("4 a 5", "QT_MAT_BAS_4_5"),
            ("6 a 10", "QT_MAT_BAS_6_10"),
            ("11 a 14", "QT_MAT_BAS_11_14"),
            ("15 a 17", "QT_MAT_BAS_15_17"),
            ("18 ou mais", "QT_MAT_BAS_18_MAIS"),
        ],
    ),
    _grupo(
        "mat_residencia",
        "Matrículas por zona de residência do aluno",
        "matricula",
        [("Urbana", "QT_MAT_ZR_URB"), ("Rural", "QT_MAT_ZR_RUR")],
    ),
    _grupo(
        "tur_turno",
        "Turmas por turno",
        "turma",
        [("Diurno", "QT_TUR_BAS_D"), ("Noturno", "QT_TUR_BAS_N"), ("EAD/semipresencial", "QT_TUR_BAS_EAD")],
    ),
    _grupo(
        "doc_escolaridade",
        "Docentes por escolaridade",
        "docente",
        [
            ("Fundamental", "QT_DOC_BAS_ESCO_EF"),
            ("Médio", "QT_DOC_BAS_ESCO_EM"),
            ("Superior com licenciatura", "QT_DOC_BAS_ESCO_SUP_GRAD_LICEN"),
            ("Superior sem licenciatura", "QT_DOC_BAS_ESCO_SUP_GRAD_SLICEN"),
        ],
    ),
    _grupo(
        "doc_pos",
        "Docentes com pós-graduação",
        "docente",
        [
            ("Especialização", "QT_DOC_BAS_ESCO_SUP_POS_ESPEC"),
            ("Mestrado", "QT_DOC_BAS_ESCO_SUP_POS_MESTRA"),
            ("Doutorado", "QT_DOC_BAS_ESCO_SUP_POS_DOUTO"),
        ],
    ),
    _grupo(
        "doc_vinculo",
        "Docentes por vínculo (rede pública)",
        "docente",
        [
            ("Concursado/efetivo", "QT_DOC_BAS_VINCULO_CONCUR"),
            ("Contrato temporário", "QT_DOC_BAS_VINCULO_CONTRA"),
            ("Terceirizado", "QT_DOC_BAS_VINCULO_TERCEIR"),
            ("CLT", "QT_DOC_BAS_VINCULO_CLT"),
        ],
    ),
    _grupo(
        "doc_idade",
        "Docentes por faixa etária",
        "docente",
        [
            ("Até 24", "QT_DOC_BAS_0_24"),
            ("25 a 29", "QT_DOC_BAS_25_29"),
            ("30 a 39", "QT_DOC_BAS_30_39"),
            ("40 a 49", "QT_DOC_BAS_40_49"),
            ("50 a 54", "QT_DOC_BAS_50_54"),
            ("55 a 59", "QT_DOC_BAS_55_59"),
            ("60 ou mais", "QT_DOC_BAS_60_MAIS"),
        ],
    ),
    _grupo("doc_sexo", "Docentes por sexo", "docente", [("Feminino", "QT_DOC_BAS_FEM"), ("Masculino", "QT_DOC_BAS_MASC")]),
    _grupo(
        "gest_acesso",
        "Gestores por forma de acesso ao cargo",
        "gestor",
        [
            ("Proprietário(a)", "QT_GEST_BAS_ACESSO_CARGO_PROP"),
            ("Indicação", "QT_GEST_BAS_ACESSO_CARGO_INDIC"),
            ("Processo seletivo", "QT_GEST_BAS_ACESSO_CARGO_SEL"),
            ("Concurso", "QT_GEST_BAS_ACESSO_CARGO_CONC"),
            ("Eleição", "QT_GEST_BAS_ACESSO_CARGO_ELEIC"),
            ("Seleção + eleição", "QT_GEST_BAS_ACESSO_CARGO_P_SEL"),
            ("Outro", "QT_GEST_BAS_ACESSO_CARGO_OUTRO"),
        ],
    ),
]


class MetricaSerie(TypedDict):
    """Métrica acompanhada ano a ano (quantidade somada ou item de infraestrutura)."""

    id: str
    rotulo: str
    tipo: str
    tabela: str
    coluna: str
    valor: int


ROTULOS_TOTAIS = {"matriculas": "Matrículas", "turmas": "Turmas", "docentes": "Docentes", "gestores": "Gestores"}
TIPO_QUANTIDADE = "quantidade"
TIPO_INFRAESTRUTURA = "infraestrutura"


def _metricas_serie() -> list[MetricaSerie]:
    etapas = next(grupo for grupo in GRUPOS if grupo["id"] == "mat_etapa")
    quantidades = [(ROTULOS_TOTAIS[nome], tabela, coluna) for nome, tabela, coluna in TOTAIS]
    quantidades += [(f"Matrículas – {rotulo}", "matricula", coluna) for rotulo, coluna in etapas["itens"]]
    metricas: list[MetricaSerie] = [
        {"id": coluna, "rotulo": rotulo, "tipo": TIPO_QUANTIDADE, "tabela": tabela, "coluna": coluna, "valor": 0}
        for rotulo, tabela, coluna in quantidades
    ]
    metricas += [
        {"id": item["coluna"], "rotulo": item["rotulo"], "tipo": TIPO_INFRAESTRUTURA, "tabela": "escola", "coluna": item["coluna"], "valor": item["valor"]}
        for item in INFRAESTRUTURA
    ]
    return metricas


# Métricas acompanhadas ano a ano (escola, município e estado); o id é o nome da coluna do Censo.
METRICAS_SERIE: list[MetricaSerie] = _metricas_serie()


def exportar_indicadores() -> dict[str, object]:
    """Serializa as definições para o site.

    Exemplo:
        >>> exportar_indicadores()["etapas"]["CRE"]
        'Creche'
    """
    return {
        "grupos": [{**grupo, "itens": [list(item) for item in grupo["itens"]]} for grupo in GRUPOS],
        "infraestrutura": INFRAESTRUTURA,
        "etapas": {sigla: rotulo for sigla, (rotulo, _) in ETAPAS.items()},
        "colunas_etapas": {sigla: colunas for sigla, (_, colunas) in ETAPAS.items()},
        "metricas_serie": METRICAS_SERIE,
    }
