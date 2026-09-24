// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Alternância entre tema claro e escuro, lembrada entre visitas.

/** @typedef {"claro"|"escuro"} Tema */
/** @typedef {{getItem: (chave: string) => string|null, setItem: (chave: string, valor: string) => void}} ArmazenamentoTema */

// Mesma chave lida por js/tema-inicial.js, que aplica o tema antes da pintura para evitar piscar.
export const CHAVE_TEMA = "sieerj-tema";
// O CSS usa os valores de data-theme em inglês ("light"/"dark").
const ATRIBUTO_CSS = { claro: "light", escuro: "dark" };

/**
 * Lê o tema salvo; devolve "" se não houver ou se o armazenamento estiver bloqueado.
 * @example lerTemaSalvo(window.localStorage) // "escuro"
 * @param {ArmazenamentoTema} armazenamento
 * @returns {Tema|""}
 */
export function lerTemaSalvo(armazenamento) {
  try {
    const valor = armazenamento.getItem(CHAVE_TEMA);
    return valor === "claro" || valor === "escuro" ? valor : "";
  } catch {
    return "";
  }
}

/**
 * Salva o tema escolhido, ignorando armazenamento bloqueado (ex.: janela privada).
 * @example salvarTema(window.localStorage, "claro")
 * @param {ArmazenamentoTema} armazenamento
 * @param {Tema} tema
 * @returns {void}
 */
export function salvarTema(armazenamento, tema) {
  try {
    armazenamento.setItem(CHAVE_TEMA, tema);
  } catch {
    // Sem armazenamento o tema vale só para esta página; não é erro para o usuário.
  }
}

/**
 * Tema em uso: o salvo, ou o do sistema operacional quando nada foi escolhido.
 * @example temaEfetivo("", true) // "escuro"
 * @param {Tema|""} salvo
 * @param {boolean} sistemaPrefereEscuro
 * @returns {Tema}
 */
export function temaEfetivo(salvo, sistemaPrefereEscuro) {
  if (salvo) return salvo;
  return sistemaPrefereEscuro ? "escuro" : "claro";
}

/**
 * Inverte o tema.
 * @example temaOposto("claro") // "escuro"
 * @param {Tema} tema
 * @returns {Tema}
 */
export function temaOposto(tema) {
  return tema === "claro" ? "escuro" : "claro";
}

/**
 * Aplica o tema no elemento raiz (html) via data-theme.
 * @example aplicarTema(document.documentElement, "escuro")
 * @param {HTMLElement} raiz
 * @param {Tema} tema
 * @returns {void}
 */
export function aplicarTema(raiz, tema) {
  raiz.dataset.theme = ATRIBUTO_CSS[tema];
}

function rotularBotao(botao, tema) {
  const proximo = temaOposto(tema);
  botao.textContent = proximo === "escuro" ? "☾ Escuro" : "☀ Claro";
  botao.setAttribute("aria-label", `Ativar tema ${proximo}`);
}

/**
 * Cria o botão que alterna o tema e salva a escolha.
 * @example cabecalho.append(criarBotaoTema(window))
 * @param {Window} janela
 * @returns {HTMLButtonElement}
 */
export function criarBotaoTema(janela) {
  const raiz = janela.document.documentElement;
  const sistemaEscuro = janela.matchMedia("(prefers-color-scheme: dark)").matches;
  let tema = temaEfetivo(lerTemaSalvo(janela.localStorage), sistemaEscuro);
  const botao = janela.document.createElement("button");
  botao.type = "button";
  botao.className = "botao-tema";
  rotularBotao(botao, tema);
  botao.addEventListener("click", () => {
    tema = temaOposto(tema);
    aplicarTema(raiz, tema);
    salvarTema(janela.localStorage, tema);
    rotularBotao(botao, tema);
  });
  return botao;
}
