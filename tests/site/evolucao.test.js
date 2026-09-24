// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatadoresDoTipo, textoVariacao } from "../../site/js/evolucao.js";
import { caminhoComLacunas, rotulosCabem, ticksLimpos } from "../../site/js/graficos-linha.js";
import { simboloInfra } from "../../site/js/ficha-historico.js";
import { urlComAno } from "../../site/js/seletor-ano.js";
import { formatarNumero } from "../../site/js/formato.js";

test("ticksLimpos gera passos redondos cobrindo o máximo", () => {
  assert.deepEqual(ticksLimpos(87), [0, 25, 50, 75, 100]);
  assert.deepEqual(ticksLimpos(0), [0, 1]);
  const ticks = ticksLimpos(3319771);
  assert.ok(ticks[ticks.length - 1] >= 3319771);
});
test("caminhoComLacunas interrompe a linha em anos sem dado", () => {
  assert.equal(caminhoComLacunas([[0, 10], [5, 8], null, [20, 5]]), "M0 10 L5 8 M20 5");
});
test("rotulosCabem detecta colisão", () => {
  assert.equal(rotulosCabem([10, 40, 45], 14), false);
  assert.equal(rotulosCabem([10, 40], 14), true);
});
test("formatadoresDoTipo", () => {
  assert.equal(formatadoresDoTipo("infraestrutura").formatar(42.5), "42,5%");
  assert.equal(formatadoresDoTipo("infraestrutura").maximo, 100);
  assert.equal(formatadoresDoTipo("razao").formatar(21.25), "21,3");
});
test("textoVariacao usa anos do primeiro e último dado", () => {
  assert.equal(textoVariacao([10, null, 15], [2019, 2020, 2021], formatarNumero), "2019 → 2021: 10 → 15 (+50%)");
  assert.equal(textoVariacao([null, 3], [2019, 2020], formatarNumero), "");
});
test("simboloInfra", () => assert.deepEqual([1, 0, null].map(simboloInfra), ["✓", "–", "·"]));
test("urlComAno omite o ano mais recente", () => {
  assert.equal(urlComAno("?codigo=1", 2019, 2025), "?codigo=1&ano=2019");
  assert.equal(urlComAno("?codigo=1&ano=2019", 2025, 2025), "?codigo=1");
  assert.equal(urlComAno("", 2025, 2025), "");
});
