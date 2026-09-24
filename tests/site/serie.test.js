// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import assert from "node:assert/strict";
import { test } from "node:test";
import { alinharAnos, colunaDaSerie, dividirSeries, minusculaInicial, opcoesDeMetrica, valoresDaMetrica, variacao } from "../../site/js/serie.js";

const metricas = ["ESCOLAS_ATIVAS", "QT_MAT_BAS", "QT_TUR_BAS"];
const linhas = [[10, 300, 10], null, [12, 360, 0]];

test("colunaDaSerie trata ano ausente e métrica desconhecida", () => {
  assert.deepEqual(colunaDaSerie(linhas, metricas, "QT_MAT_BAS"), [300, null, 360]);
  assert.throws(() => colunaDaSerie(linhas, metricas, "X"), /desconhecida/);
});
test("dividirSeries protege zero e nulo", () => assert.deepEqual(dividirSeries([60, 10, null], [2, 0, 1]), [30, null, null]));
test("valoresDaMetrica calcula razões derivadas", () => assert.deepEqual(valoresDaMetrica(linhas, metricas, "ALUNOS_POR_TURMA"), [30, null, null]));
test("opcoesDeMetrica ordena e rotula infraestrutura", () => {
  const publicadas = [
    { id: "QT_MAT_BAS", rotulo: "Matrículas", tipo: "quantidade", tabela: "matricula", coluna: "QT_MAT_BAS", valor: 0 },
    { id: "IN_INTERNET", rotulo: "Internet", tipo: "infraestrutura", tabela: "escola", coluna: "IN_INTERNET", valor: 1 },
  ];
  const opcoes = opcoesDeMetrica(publicadas, true);
  assert.equal(opcoes[0].id, "ESCOLAS_ATIVAS");
  assert.ok(opcoes.some((o) => o.rotulo === "% com internet"));
  assert.ok(!opcoesDeMetrica(publicadas, false).some((o) => o.id === "ESCOLAS_ATIVAS"));
});
test("variacao entre primeiro e último valor", () => {
  assert.deepEqual(variacao([null, 100, 150]), { inicio: 100, fim: 150, percentual: 50 });
  assert.equal(variacao([5]), null);
  assert.equal(variacao([0, 3]).percentual, null);
});
test("alinharAnos preenche anos ausentes", () => assert.deepEqual(alinharAnos([2019, 2025], ["a", "b"], [2019, 2020, 2025]), ["a", null, "b"]));
test("minusculaInicial preserva siglas (regressão: aparecia \"(pne)\")", () => {
  assert.equal(minusculaInicial("Banheiro acessível (PNE)"), "banheiro acessível (PNE)");
  assert.equal(minusculaInicial(""), "");
});
