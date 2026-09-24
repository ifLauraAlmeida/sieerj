// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import assert from "node:assert/strict";
import { test } from "node:test";
import { classificarCampos, ehIndicadorBinario, etapasDaEscola, filtrarColetados, secaoDoCampo } from "../../site/js/secoes.js";

test("secaoDoCampo usa o prefixo mais longo", () => {
  assert.equal(secaoDoCampo("IN_BIBLIOTECA_SALA_LEITURA"), "dependencias");
  assert.equal(secaoDoCampo("TP_LOCALIZACAO_DIFERENCIADA"), "identificacao");
  assert.equal(secaoDoCampo("IN_ESP_EXCLUSIVA_PRE"), "oferta");
  assert.equal(secaoDoCampo("XYZ"), "outros");
});
test("classificarCampos preserva a ordem", () => {
  const campos = classificarCampos({ IN_QUADRA_ESPORTES: 1, NO_ENTIDADE: "X", IN_BANHEIRO: 0 });
  assert.deepEqual(campos.get("dependencias"), ["IN_QUADRA_ESPORTES", "IN_BANHEIRO"]);
  assert.deepEqual(campos.get("identificacao"), ["NO_ENTIDADE"]);
});
test("etapasDaEscola segue colunas exportadas", () => {
  const indicadores = { colunas_etapas: { CRE: ["IN_COMUM_CRECHE"], EJA: ["IN_EJA"] } };
  assert.deepEqual(etapasDaEscola({ IN_EJA: 1, IN_COMUM_CRECHE: 0 }, indicadores), ["EJA"]);
});
test("ehIndicadorBinario só para IN_ com 0/1", () => {
  assert.ok(ehIndicadorBinario("IN_INTERNET", 0));
  assert.ok(!ehIndicadorBinario("TP_REDE_LOCAL", 1));
  assert.ok(!ehIndicadorBinario("IN_ACESSO_INTERNET_COMPUTADOR", 9));
});
test("filtrarColetados remove variáveis não coletadas no ano", () => {
  const dicionario = { IN_A: { descricao: "", categorias: {}, anos_coleta: [2019] }, IN_B: { descricao: "", categorias: {}, anos_coleta: [] } };
  assert.deepEqual(filtrarColetados({ IN_A: 0, IN_B: 1, IN_C: 1 }, dicionario, 2018), { IN_B: 1, IN_C: 1 });
  assert.deepEqual(filtrarColetados({ IN_A: 0 }, dicionario, 2019), { IN_A: 0 });
});
