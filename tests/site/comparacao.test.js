// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import assert from "node:assert/strict";
import { test } from "node:test";
import { linhasParaEscolas } from "../../site/js/busca.js";
import { adicionarId, lerSelecao, selecaoParaUrl, sugerirEscolas, sugerirMunicipios } from "../../site/js/comparacao.js";

test("lerSelecao limpa ids e limita a 4", () => {
  const selecao = lerSelecao(new URLSearchParams("tipo=escola&ids=1,2,2,x,3,4,5&metrica=QT_MAT_BAS"));
  assert.deepEqual(selecao, { tipo: "escola", ids: ["1", "2", "3", "4"], metrica: "QT_MAT_BAS" });
  assert.equal(lerSelecao(new URLSearchParams("")).tipo, "municipio");
});
test("selecaoParaUrl mantém vírgulas legíveis", () => {
  assert.equal(selecaoParaUrl({ tipo: "municipio", ids: ["1", "2"], metrica: "" }), "tipo=municipio&ids=1,2");
});
test("adicionarId não repete nem passa do limite", () => {
  assert.deepEqual(adicionarId(["1"], "1"), ["1"]);
  assert.deepEqual(adicionarId(["1", "2", "3", "4"], "5"), ["1", "2", "3", "4"]);
  assert.deepEqual(adicionarId([], "7"), ["7"]);
});
test("sugestões ignoram acento e selecionados", () => {
  const municipios = { 3304904: "São Gonçalo", 3304557: "Rio de Janeiro" };
  assert.deepEqual(sugerirMunicipios(municipios, "sao", []).map((m) => m.id), ["3304904"]);
  assert.deepEqual(sugerirMunicipios(municipios, "sao", ["3304904"]), []);
  const escolas = linhasParaEscolas({ colunas: ["codigo", "nome", "municipio", "etapas"], linhas: [[33036594, "CE NAZIRA SALOMAO", 3300100, ""]], municipios: {}, ano: 2025 });
  assert.equal(sugerirEscolas(escolas, { 3300100: "Angra dos Reis" }, "nazira", [])[0].detalhe, "Angra dos Reis · INEP 33036594");
  assert.deepEqual(sugerirEscolas(escolas, {}, "na", []), []);
});
