// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  atendeFiltros, atendeTexto, filtrarEscolas, filtrosDaUrl, filtrosParaUrl, linhasParaEscolas, paginar,
} from "../../site/js/busca.js";

const indice = {
  ano: 2025,
  municipios: {},
  colunas: ["codigo", "nome", "municipio", "dependencia", "localizacao", "situacao", "matriculas", "turmas", "docentes", "etapas"],
  linhas: [
    [33036594, "CE NAZIRA SALOMÃO", 3300100, 2, 1, 1, 993, 33, 49, "EFF,MED"],
    [33000002, "EM PEDRO II", 3303302, 3, 2, 1, 50, 2, 3, ""],
  ],
};
const escolas = linhasParaEscolas(indice);
const semFiltro = filtrosDaUrl(new URLSearchParams(""));

test("linhasParaEscolas nomeia colunas e separa etapas", () => {
  assert.deepEqual(escolas[0].etapas, ["EFF", "MED"]);
  assert.deepEqual(escolas[1].etapas, []);
  assert.equal(escolas[0].nomeBusca, "ce nazira salomao");
});
test("filtros vão e voltam da URL", () => {
  const filtros = filtrosDaUrl(new URLSearchParams("texto=pedro&etapa=MED"));
  assert.equal(filtrosParaUrl(filtros), "texto=pedro&etapa=MED");
});
test("atendeTexto por termos sem acento e por código", () => {
  assert.ok(atendeTexto(escolas[0], "salomao nazira"));
  assert.ok(atendeTexto(escolas[0], "330365"));
  assert.ok(!atendeTexto(escolas[1], "330365"));
});
test("atendeFiltros combina critérios", () => {
  assert.ok(atendeFiltros(escolas[0], { ...semFiltro, etapa: "MED", dependencia: "2" }));
  assert.ok(!atendeFiltros(escolas[0], { ...semFiltro, localizacao: "2" }));
});
test("filtrarEscolas por município", () => {
  assert.deepEqual(filtrarEscolas(escolas, { ...semFiltro, municipio: "3303302" }).map((e) => e.codigo), [33000002]);
});
test("paginar limita a página ao intervalo", () => {
  assert.deepEqual(paginar([1, 2, 3], 2, 2), { itens: [3], pagina: 2, totalPaginas: 2 });
  assert.equal(paginar([1, 2, 3], 9, 2).pagina, 2);
  assert.equal(paginar([], 1, 2).totalPaginas, 1);
});
