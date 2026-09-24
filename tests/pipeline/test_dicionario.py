# SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import unittest

from pipeline.dicionario import (
    anos_coletados,
    coletada_no_ano,
    colunas_de_ano,
    ler_dicionario,
    ler_textos_compartilhados,
    ler_variaveis_planilha,
    limpar_descricao,
    planilhas_do_xlsx,
)
from tests.pipeline.amostras import NS_XLSX, PLANILHA_XLSX, TEXTOS_XLSX, zips_dicionario
from tests.pipeline.falsos import SistemaArquivosFalso


class DicionarioTeste(unittest.TestCase):
    def test_textos_compartilhados(self) -> None:
        self.assertEqual(ler_textos_compartilhados(TEXTOS_XLSX)[0], "TP_LOCALIZACAO")

    def test_variaveis_da_planilha_ignoram_cabecalho(self) -> None:
        variaveis = ler_variaveis_planilha(PLANILHA_XLSX, ler_textos_compartilhados(TEXTOS_XLSX))
        self.assertEqual(list(variaveis), ["TP_LOCALIZACAO"])
        self.assertEqual(variaveis["TP_LOCALIZACAO"], {"descricao": "Localização", "categorias": {"1": "Urbana", "2": "Rural"}, "anos_coleta": []})

    def test_limpar_descricao_remove_barra_final(self) -> None:
        self.assertEqual(limpar_descricao("Número de Matrículas /  "), "Número de Matrículas")

    def test_planilhas_em_ordem_numerica(self) -> None:
        membros = ["xl/worksheets/sheet10.xml", "xl/worksheets/sheet2.xml", "xl/styles.xml"]
        self.assertEqual(planilhas_do_xlsx(membros), ["xl/worksheets/sheet2.xml", "xl/worksheets/sheet10.xml"])

    def test_ler_dicionario_com_uma_planilha(self) -> None:
        dicionario = ler_dicionario(SistemaArquivosFalso(zips=zips_dicionario("d.xlsx")), "d.xlsx")
        self.assertEqual(dicionario["TP_LOCALIZACAO"]["categorias"]["2"], "Rural")

    def test_colunas_de_ano_exige_ao_menos_dois_anos(self) -> None:
        self.assertEqual(colunas_de_ano({"B": "x", "G": "07", "H": "08"}), {"G": 2007, "H": 2008})
        self.assertEqual(colunas_de_ano({"A": "12"}), {})
        # Regressão: linha de variável com N=21 (A) e tamanho 10 (E) não é cabeçalho de anos.
        self.assertEqual(colunas_de_ano({"A": "21", "B": "QT_X", "E": "10", "G": "s"}), {})
        self.assertEqual(colunas_de_ano({"AA": "07", "AB": "08"}), {"AA": 2007, "AB": 2008})

    def test_anos_coletados_aceita_s_maiusculo(self) -> None:
        self.assertEqual(anos_coletados({"G": "-", "H": " S "}, {"G": 2007, "H": 2008}), [2008])

    def test_coletada_no_ano(self) -> None:
        variavel = {"descricao": "", "categorias": {}, "anos_coleta": [2019]}
        self.assertEqual((coletada_no_ano(variavel, 2018), coletada_no_ano(variavel, 2019)), (False, True))
        self.assertTrue(coletada_no_ano({**variavel, "anos_coleta": []}, 2000))
        self.assertTrue(coletada_no_ano(None, 2000))

    def test_planilha_com_matriz_de_coleta(self) -> None:
        textos = ["IN_INTERNET_ALUNOS", "Internet para alunos", "07", "08", "n", "s"]
        sst = f"<sst {NS_XLSX}>" + "".join(f"<si><t>{t}</t></si>" for t in textos) + "</sst>"
        xml = (
            f"<worksheet {NS_XLSX}><sheetData>"
            '<row><c r="G1" t="s"><v>2</v></c><c r="H1" t="s"><v>3</v></c></row>'
            '<row><c r="B2" t="s"><v>0</v></c><c r="C2" t="s"><v>1</v></c><c r="G2" t="s"><v>4</v></c><c r="H2" t="s"><v>5</v></c></row>'
            "</sheetData></worksheet>"
        ).encode()
        variaveis = ler_variaveis_planilha(xml, ler_textos_compartilhados(sst.encode()))
        self.assertEqual(variaveis["IN_INTERNET_ALUNOS"]["anos_coleta"], [2008])
