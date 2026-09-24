// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import assert from "node:assert/strict";
import { test } from "node:test";
import { calcularRazao, itensDeCategoria, percentuaisInfraestrutura } from "../../site/js/painel.js";
import { linhasMunicipios, ordenarLinhas } from "../../site/js/tabela-municipios.js";
import { agruparPorDescricao } from "../../site/js/ficha-secoes.js";

const agregado = (nome, matriculas, internet) => ({
  nome, em_atividade: 10, escolas: 12, infraestrutura: [internet], categorias: {}, grupos: {}, etapas: {}, cursos: [],
  totais: { matriculas, turmas: 10, docentes: 5, gestores: 1 },
});

test("calcularRazao protege divisão por zero", () => {
  assert.equal(calcularRazao(300, 12), 25);
  assert.equal(calcularRazao(3, 0), 0);
});
test("itensDeCategoria rotula e ordena", () => {
  const dicionario = { TP_LOCALIZACAO: { descricao: "", categorias: { 1: "Urbana", 2: "Rural" } } };
  assert.deepEqual(itensDeCategoria({ 1: 3, 2: 7 }, "TP_LOCALIZACAO", dicionario), [{ rotulo: "Rural", valor: 7 }, { rotulo: "Urbana", valor: 3 }]);
});
test("percentuaisInfraestrutura sobre escolas ativas", () => assert.deepEqual(percentuaisInfraestrutura(agregado("A", 1, 5)), [50]));
test("linhasMunicipios e ordenarLinhas", () => {
  const linhas = linhasMunicipios({ 1: agregado("Niterói", 100, 10), 2: agregado("Angra", 300, 5) });
  assert.equal(linhas[0].alunosPorTurma, 10);
  assert.deepEqual(ordenarLinhas(linhas, "matriculas", "descending").map((l) => l.nome), ["Angra", "Niterói"]);
  assert.deepEqual(ordenarLinhas(linhas, "nome", "ascending").map((l) => l.nome), ["Angra", "Niterói"]);
});
test("agruparPorDescricao agrupa pelo prefixo da descrição", () => {
  const dicionario = {
    IN_AGUA_POTAVEL: { descricao: "Fornece água potável", categorias: {} },
    IN_AGUA_REDE_PUBLICA: { descricao: "Abastecimento de água - Rede pública", categorias: {} },
  };
  const grupos = agruparPorDescricao(["IN_AGUA_POTAVEL", "IN_AGUA_REDE_PUBLICA"], dicionario);
  assert.deepEqual([...grupos.keys()], ["", "Abastecimento de água"]);
  assert.equal(grupos.get("Abastecimento de água")[0].item, "Rede pública");
});
