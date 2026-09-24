// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calcularPercentual, descreverVariavel, dividirDescricao, formatarCampo, formatarDataInep,
  formatarNumero, formatarPercentual, normalizarTexto, rotuloCategoria,
} from "../../site/js/formato.js";

const dicionario = {
  TP_LOCALIZACAO: { descricao: "Localização", categorias: { 1: "Urbana", 2: "Rural" } },
  QT_MAT_BAS: { descricao: "Número de Matrículas", categorias: {} },
};

test("formatarNumero usa separador brasileiro", () => assert.equal(formatarNumero(3319771), "3.319.771"));
test("calcularPercentual protege divisão por zero", () => assert.equal(calcularPercentual(1, 0), 0));
test("formatarPercentual com uma casa", () => assert.equal(formatarPercentual(1, 3), "33,3%"));
test("formatarDataInep converte mês em inglês", () => assert.equal(formatarDataInep("06FEB2025:00:00:00"), "06/02/2025"));
test("formatarDataInep mantém texto desconhecido", () => assert.equal(formatarDataInep("xx"), "xx"));
test("rotuloCategoria traduz e tem fallback", () => {
  assert.equal(rotuloCategoria(dicionario, "TP_LOCALIZACAO", 2), "Rural");
  assert.equal(rotuloCategoria(dicionario, "TP_X", 9), "9");
});
test("dividirDescricao separa no primeiro hífen", () => {
  assert.deepEqual(dividirDescricao("Água - Rede pública - x"), { grupo: "Água", item: "Rede pública - x" });
  assert.deepEqual(dividirDescricao("Sem grupo"), { grupo: "", item: "Sem grupo" });
});
test("descreverVariavel usa nome técnico como alternativa", () => assert.equal(descreverVariavel(dicionario, "QT_Z"), "QT_Z"));
test("formatarCampo por tipo", () => {
  assert.equal(formatarCampo(dicionario, "TP_LOCALIZACAO", 1), "Urbana");
  assert.equal(formatarCampo(dicionario, "QT_MAT_BAS", 1200), "1.200");
  assert.equal(formatarCampo(dicionario, "CO_ENTIDADE", 33036594), "33036594");
  // Regressão: o ano do Censo aparecia como "2.025".
  assert.equal(formatarCampo(dicionario, "NU_ANO_CENSO", 2025), "2025");
  assert.match(formatarCampo(dicionario, "QT_PROF_SAUDE", 88888), /extremo/);
});
test("normalizarTexto remove acentos", () => assert.equal(normalizarTexto(" São Gonçalo "), "sao goncalo"));
