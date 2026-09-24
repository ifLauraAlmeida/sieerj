// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Criação segura de elementos: textos entram sempre como nós de texto, nunca como HTML.

/**
 * Cria um elemento com atributos e filhos.
 * @example criar("a", {href: "escola.html"}, "Ver ficha")
 * @param {string} tag
 * @param {Record<string, string|number|boolean|undefined>} atributos
 * @param {...(Node|string|number|null|undefined|false)} filhos
 * @returns {HTMLElement}
 */
export function criar(tag, atributos = {}, ...filhos) {
  const elemento = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === false) continue;
    if (nome === "class") elemento.className = String(valor);
    else elemento.setAttribute(nome, valor === true ? "" : String(valor));
  }
  anexar(elemento, filhos);
  return elemento;
}

/**
 * Anexa filhos ignorando valores vazios.
 * @example anexar(lista, [criar("li", {}, "a"), null])
 * @param {HTMLElement} pai
 * @param {Array<Node|string|number|null|undefined|false>} filhos
 * @returns {void}
 */
export function anexar(pai, filhos) {
  for (const filho of filhos.flat()) {
    if (filho === null || filho === undefined || filho === false) continue;
    pai.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  }
}

/**
 * Substitui o conteúdo de um alvo.
 * @example substituir(document.querySelector("#painel"), criar("p", {}, "Olá"))
 * @param {Element} alvo
 * @param {...(Node|string|null|undefined|false)} filhos
 * @returns {void}
 */
export function substituir(alvo, ...filhos) {
  alvo.replaceChildren();
  anexar(/** @type {HTMLElement} */ (alvo), filhos);
}

/**
 * Mostra mensagem de erro amigável no lugar do conteúdo.
 * @example mostrarErro(main, new Error("x"))
 * @param {Element} alvo
 * @param {Error} erro
 * @returns {void}
 */
export function mostrarErro(alvo, erro) {
  console.error(JSON.stringify({ evento: "erro_pagina", mensagem: erro.message }));
  substituir(
    alvo,
    criar(
      "div",
      { class: "erro", role: "alert" },
      criar("h2", {}, "Não foi possível carregar os dados"),
      criar("p", {}, erro.message),
      criar("p", {}, "Gere os dados com ", criar("code", {}, "make dados"), " e sirva o site com ", criar("code", {}, "make servir"), "."),
    ),
  );
}
