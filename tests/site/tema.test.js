// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
import assert from "node:assert/strict";
import { test } from "node:test";
import { CHAVE_TEMA, aplicarTema, lerTemaSalvo, salvarTema, temaEfetivo, temaOposto } from "../../site/js/tema.js";

/** localStorage falso em memória. */
class ArmazenamentoFalso {
  constructor(valores = {}) {
    this.valores = { ...valores };
  }

  getItem(chave) {
    return this.valores[chave] ?? null;
  }

  setItem(chave, valor) {
    this.valores[chave] = valor;
  }
}

/** localStorage que lança erro, como em janelas privadas com armazenamento bloqueado. */
class ArmazenamentoBloqueado {
  getItem() {
    throw new Error("bloqueado");
  }

  setItem() {
    throw new Error("bloqueado");
  }
}

test("lerTemaSalvo aceita só valores conhecidos", () => {
  assert.equal(lerTemaSalvo(new ArmazenamentoFalso({ [CHAVE_TEMA]: "escuro" })), "escuro");
  assert.equal(lerTemaSalvo(new ArmazenamentoFalso({ [CHAVE_TEMA]: "roxo" })), "");
  assert.equal(lerTemaSalvo(new ArmazenamentoBloqueado()), "");
});
test("salvarTema grava e tolera bloqueio", () => {
  const armazenamento = new ArmazenamentoFalso();
  salvarTema(armazenamento, "claro");
  assert.equal(armazenamento.getItem(CHAVE_TEMA), "claro");
  assert.doesNotThrow(() => salvarTema(new ArmazenamentoBloqueado(), "claro"));
});
test("temaEfetivo prioriza escolha e cai no sistema", () => {
  assert.equal(temaEfetivo("claro", true), "claro");
  assert.equal(temaEfetivo("", true), "escuro");
  assert.equal(temaEfetivo("", false), "claro");
});
test("temaOposto alterna", () => assert.equal(temaOposto("escuro"), "claro"));
test("aplicarTema usa valores do CSS", () => {
  const raiz = { dataset: {} };
  aplicarTema(raiz, "escuro");
  assert.equal(raiz.dataset.theme, "dark");
});
