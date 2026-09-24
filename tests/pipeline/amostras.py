# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
"""CSVs mínimos no formato do INEP (separador ";") para os dois layouts."""

from pipeline.tabelas import CensoRJ

IDENTIFICACAO = "NU_ANO_CENSO;NO_UF;SG_UF;CO_UF;NO_MUNICIPIO;CO_MUNICIPIO;NO_ENTIDADE;CO_ENTIDADE"
ESCOLA_CSV = (
    f"{IDENTIFICACAO};TP_DEPENDENCIA;TP_LOCALIZACAO;TP_SITUACAO_FUNCIONAMENTO;IN_INTERNET;IN_COMUM_CRECHE;IN_EJA;NU_CNPJ_ESCOLA_PRIVADA\n"
    "2025;Rio de Janeiro;RJ;33;Angra dos Reis;3300100;ESCOLA A;33000001;2;1;1;1;0;1;\n"
    "2025;Rio de Janeiro;RJ;33;Niterói;3303302;ESCOLA B;33000002;4;1;1;0;1;0;01234567000189\n"
    "2025;Rio de Janeiro;RJ;33;Niterói;3303302;ESCOLA EXTINTA;33000003;3;2;3;;;;\n"
    "2025;São Paulo;SP;35;São Paulo;3550308;ESCOLA SP;35000001;3;1;1;1;1;0;\n"
)
MATRICULA_CSV = (
    f"{IDENTIFICACAO};QT_MAT_BAS;QT_MAT_INF_CRE;QT_MAT_EJA\n"
    "2025;Rio de Janeiro;RJ;33;Angra dos Reis;3300100;ESCOLA A;33000001;100;0;100\n"
    "2025;Rio de Janeiro;RJ;33;Niterói;3303302;ESCOLA B;33000002;40;40;0\n"
)
TURMA_CSV = f"{IDENTIFICACAO};QT_TUR_BAS\n2025;Rio de Janeiro;RJ;33;Angra dos Reis;3300100;ESCOLA A;33000001;4\n"
DOCENTE_CSV = f"{IDENTIFICACAO};QT_DOC_BAS\n2025;Rio de Janeiro;RJ;33;Angra dos Reis;3300100;ESCOLA A;33000001;8\n"
GESTOR_CSV = f"{IDENTIFICACAO};QT_GEST_BAS\n2025;Rio de Janeiro;RJ;33;Angra dos Reis;3300100;ESCOLA A;33000001;1\n"
CURSO_CSV = (
    f"{IDENTIFICACAO};NO_AREA_CURSO_PROFISSIONAL;NO_CURSO_EDUC_PROFISSIONAL;QT_MAT_CURSO_TEC\n"
    "2025;Rio de Janeiro;RJ;33;Niterói;3303302;ESCOLA B;33000002;Ambiente e saúde;Enfermagem;30\n"
    "2025;Rio de Janeiro;RJ;33;Niterói;3303302;ESCOLA B;33000002;Gestão e negócios;Administração;10\n"
)

# Layout de arquivo único (2007–2024): cadastro e quantidades na mesma linha; sem gestor.
UNICO_CSV = (
    f"{IDENTIFICACAO};TP_DEPENDENCIA;TP_SITUACAO_FUNCIONAMENTO;IN_INTERNET;QT_MAT_BAS;QT_TUR_BAS;QT_DOC_BAS;QT_TRANSP_PUBLICO\n"
    "2019;Rio de Janeiro;RJ;33;Angra dos Reis;3300100;ESCOLA A;33000001;2;1;0;80;4;6;10\n"
    "2019;Rio de Janeiro;RJ;33;Niterói;3303302;ESCOLA C;33000009;3;1;1;50;2;3;0\n"
    "2019;Minas Gerais;MG;31;Belo Horizonte;3106200;ESCOLA MG;31000001;3;1;1;50;2;3;0\n"
)
SUPLEMENTO_CSV = (
    f"{IDENTIFICACAO};NO_CURSO_EDUC_PROFISSIONAL;QT_MAT_CURSO_TEC\n"
    "2019;Rio de Janeiro;RJ;33;Niterói;3303302;ESCOLA C;33000009;Informática;25\n"
)

DIRETORIO = "censo/dados"
DIR_2019 = "extraidos/2019"
DIR_2025 = "extraidos/2025"
DICIONARIO_XLSX = "Anexos/ANEXO I - Dicionário de Dados/dicionario.xlsx"


def arquivos_censo(diretorio: str = DIRETORIO) -> dict[str, str]:
    """Mapa caminho → conteúdo com as seis tabelas, com nomes no padrão do INEP."""
    return {
        f"{diretorio}/Tabela_Escola_2025_V2.csv": ESCOLA_CSV,
        f"{diretorio}/Tabela_Matricula_2025_V2.csv": MATRICULA_CSV,
        f"{diretorio}/Tabela_Turma_2025_V2.csv": TURMA_CSV,
        f"{diretorio}/Tabela_Docente_2025_V2.csv": DOCENTE_CSV,
        f"{diretorio}/Tabela_Gestor_Escolar_2025_v2.csv": GESTOR_CSV,
        f"{diretorio}/Tabela_Curso_Tecnico_2025_V2.csv": CURSO_CSV,
    }


def arquivos_unico(diretorio: str = DIR_2019) -> dict[str, str]:
    """Ano 2019 extraído no layout de arquivo único, com suplemento de cursos."""
    return {
        f"{diretorio}/microdados_ed_basica_2019/dados/microdados_ed_basica_2019.csv": UNICO_CSV,
        f"{diretorio}/microdados_ed_basica_2019/dados/suplemento_cursos_tecnicos_2019.csv": SUPLEMENTO_CSV,
    }


def censo_amostra() -> CensoRJ:
    """Carrega o recorte RJ das amostras por meio do sistema de arquivos falso."""
    from pipeline.tabelas import carregar_censo
    from tests.pipeline.falsos import SistemaArquivosFalso

    return carregar_censo(SistemaArquivosFalso(arquivos_censo()), DIRETORIO)

NS_XLSX = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
TEXTOS_XLSX = (
    f"<sst {NS_XLSX}><si><t>TP_LOCALIZACAO</t></si><si><t>Localização </t></si>"
    "<si><t>1 - Urbana\n2 - Rural</t></si><si><t>Nome da Variável</t></si></sst>"
).encode()
PLANILHA_XLSX = (
    f"<worksheet {NS_XLSX}><sheetData>"
    '<row><c r="B1" t="s"><v>3</v></c></row>'
    '<row><c r="A2"><v>1</v></c><c r="B2" t="s"><v>0</v></c><c r="C2" t="s"><v>1</v></c><c r="F2" t="s"><v>2</v></c></row>'
    "</sheetData></worksheet>"
).encode()


def zips_dicionario(caminho: str) -> dict[tuple[str, str], bytes]:
    """Membros mínimos de um dicionário .xlsx com a variável TP_LOCALIZACAO."""
    return {(caminho, "xl/sharedStrings.xml"): TEXTOS_XLSX, (caminho, "xl/worksheets/sheet1.xml"): PLANILHA_XLSX}
