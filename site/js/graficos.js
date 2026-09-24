// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Componentes visuais de dados: indicadores, barras horizontais, tabelas e dica flutuante.
// Todas as barras têm uma única série (uma cor); a identidade vem do rótulo, nunca da cor.

import { criar } from "./dom.js";
import { formatarNumero } from "./formato.js";

/**
 * @typedef {{rotulo: string, valor: number, referencia?: number, dica?: string}} ItemBarra
 * @typedef {{itens: ItemBarra[], maximo?: number, formatar?: (valor: number) => string, rotuloReferencia?: string}} OpcoesBarras
 */

/**
 * Cria um indicador numérico (stat tile).
 * @example criarIndicador({rotulo: "Matrículas", valor: "3,3 mi", detalhe: "educação básica"})
 * @param {{rotulo: string, valor: string, detalhe?: string, principal?: boolean}} opcoes
 * @returns {HTMLElement}
 */
export function criarIndicador({ rotulo, valor, detalhe, principal = false }) {
  return criar(
    "div",
    { class: principal ? "indicador indicador-principal" : "indicador" },
    criar("div", { class: "indicador-rotulo" }, rotulo),
    criar("div", { class: "indicador-valor" }, valor),
    detalhe ? criar("div", { class: "indicador-detalhe" }, detalhe) : null,
  );
}

/**
 * Cria a grade de indicadores.
 * @example criarIndicadores([{rotulo: "Escolas", valor: "11.647"}])
 * @param {Array<{rotulo: string, valor: string, detalhe?: string, principal?: boolean}>} lista
 * @returns {HTMLElement}
 */
export function criarIndicadores(lista) {
  return criar("div", { class: "indicadores" }, ...lista.map(criarIndicador));
}

function criarLinhaBarra(item, maximo, formatar) {
  const largura = maximo > 0 ? Math.min(100, (item.valor / maximo) * 100) : 0;
  const texto = item.dica ?? `${item.rotulo}: ${formatar(item.valor)}`;
  const trilho = criar("div", { class: "barra-trilho", "aria-hidden": "true" }, criar("div", { class: "barra-valor-grafico", style: `width:${largura}%` }));
  if (item.referencia !== undefined && maximo > 0) {
    trilho.append(criar("div", { class: "barra-referencia", style: `left:${Math.min(100, (item.referencia / maximo) * 100)}%` }));
  }
  return criar(
    "li",
    { class: "barra-linha", tabindex: 0, "data-dica": texto, "aria-label": texto },
    criar("span", { class: "barra-rotulo" }, item.rotulo),
    trilho,
    criar("span", { class: "barra-numero" }, formatar(item.valor)),
  );
}

/**
 * Cria barras horizontais com valor na ponta e marcador opcional de referência.
 * @example criarBarras({itens: [{rotulo: "Creche", valor: 120}]})
 * @param {OpcoesBarras} opcoes
 * @returns {HTMLElement}
 */
export function criarBarras({ itens, maximo, formatar = formatarNumero, rotuloReferencia }) {
  const limite = maximo ?? Math.max(0, ...itens.map((item) => Math.max(item.valor, item.referencia ?? 0)));
  const lista = criar("ul", { class: "barras" }, ...itens.map((item) => criarLinhaBarra(item, limite, formatar)));
  if (!rotuloReferencia) return lista;
  return criar("div", {}, lista, criar("div", { class: "legenda-referencia" }, criar("i", { "aria-hidden": "true" }), rotuloReferencia));
}

/**
 * Envolve um gráfico num cartão com título e nota.
 * @example criarCartao("Matrículas por etapa", criarBarras({...}), "Fonte: INEP")
 * @param {string} titulo
 * @param {Node} conteudo
 * @param {string} [nota]
 * @returns {HTMLElement}
 */
export function criarCartao(titulo, conteudo, nota) {
  return criar("section", { class: "cartao" }, criar("h3", {}, titulo), conteudo, nota ? criar("p", { class: "nota" }, nota) : null);
}

/**
 * Cria uma tabela simples; colunas numéricas são alinhadas à direita.
 * @example criarTabela([{rotulo: "Curso"}, {rotulo: "Matrículas", numero: true}], [["Enfermagem", "40.789"]])
 * @param {Array<{rotulo: string, numero?: boolean}>} colunas
 * @param {Array<Array<Node|string>>} linhas
 * @returns {HTMLElement}
 */
export function criarTabela(colunas, linhas) {
  const classe = (coluna) => (coluna.numero ? "numero" : undefined);
  const cabecalho = criar("tr", {}, ...colunas.map((coluna) => criar("th", { scope: "col", class: classe(coluna) }, coluna.rotulo)));
  const corpo = linhas.map((linha) => criar("tr", {}, ...linha.map((celula, i) => criar("td", { class: classe(colunas[i]) }, celula))));
  return criar("div", { class: "tabela-rolagem" }, criar("table", {}, criar("thead", {}, cabecalho), criar("tbody", {}, ...corpo)));
}

/**
 * Liga a dica flutuante a todo elemento com data-dica (hover e foco pelo teclado).
 * @example ativarDicas(document.body)
 * @param {HTMLElement} raiz
 * @returns {void}
 */
export function ativarDicas(raiz) {
  const dica = criar("div", { class: "dica", role: "tooltip", "aria-hidden": "true" });
  document.body.append(dica);
  const mostrar = (alvo, x, y) => {
    dica.textContent = alvo.dataset.dica;
    dica.style.left = `${Math.min(x + 14, window.innerWidth - dica.offsetWidth - 8)}px`;
    dica.style.top = `${y + 14}px`;
    dica.dataset.visivel = "sim";
  };
  const esconder = () => { dica.dataset.visivel = "nao"; };
  raiz.addEventListener("mousemove", (evento) => {
    const alvo = /** @type {HTMLElement} */ (evento.target).closest("[data-dica]");
    alvo ? mostrar(alvo, evento.clientX, evento.clientY) : esconder();
  });
  raiz.addEventListener("mouseleave", esconder);
  raiz.addEventListener("focusout", esconder);
}
