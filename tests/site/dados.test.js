// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import assert from "node:assert/strict";
import { test } from "node:test";
import { anoValido, carregarEscola, carregarJson, loteDaEscola } from "../../site/js/dados.js";

/** Servidor HTTP falso: responde com JSON fixo por URL e conta as chamadas. */
class BuscadorFalso {
  constructor(respostas) {
    this.respostas = respostas;
    this.chamadas = [];
  }

  buscar = async (url) => {
    this.chamadas.push(url);
    const corpo = this.respostas[url];
    return { ok: corpo !== undefined, status: corpo === undefined ? 404 : 200, json: async () => corpo };
  };
}

test("carregarJson busca uma vez e reaproveita", async () => {
  const buscador = new BuscadorFalso({ "dados/a.json": { x: 1 } });
  assert.deepEqual(await carregarJson("a.json", buscador.buscar), { x: 1 });
  await carregarJson("a.json", buscador.buscar);
  assert.equal(buscador.chamadas.length, 1);
});
test("carregarJson informa status HTTP no erro", async () => {
  const buscador = new BuscadorFalso({});
  await assert.rejects(carregarJson("falta.json", buscador.buscar), /HTTP 404/);
});
test("carregarEscola rejeita código inválido", async () => {
  await assert.rejects(carregarEscola("123", 256), /8 dígitos/);
});
test("anoValido usa o mais recente quando o pedido não foi publicado", () => {
  const anos = { anos: [2019, 2025], mais_recente: 2025, lotes_fichas: 256 };
  assert.equal(anoValido("2019", anos), 2019);
  assert.equal(anoValido("1990", anos), 2025);
  assert.equal(anoValido("", anos), 2025);
});
test("loteDaEscola bate com o pipeline", () => assert.equal(loteDaEscola("33036594", 256), 50));
test("carregarEscola busca no lote certo", async () => {
  const publicada = { ano: 2019, ficha: { escola: { NO_ENTIDADE: "B" } }, serie: { anos: [2019], valores: [[1]] } };
  const buscador = new BuscadorFalso({ "dados/escolas/2.json": { 33000002: publicada } });
  assert.deepEqual(await carregarEscola("33000002", 4, buscador.buscar), publicada);
  await assert.rejects(carregarEscola("33000006", 4, buscador.buscar), /não encontrada/);
});
