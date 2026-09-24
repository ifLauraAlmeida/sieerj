// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Seletor do ano do Censo exibido, sincronizado com ?ano= na URL.

import { criar } from "./dom.js";

/**
 * Atualiza (ou remove, se for o mais recente) o parâmetro ano da URL sem recarregar.
 * @example urlComAno("?codigo=1", 2019, 2025) // "?codigo=1&ano=2019"
 * @param {string} busca
 * @param {number} ano
 * @param {number} maisRecente
 * @returns {string}
 */
export function urlComAno(busca, ano, maisRecente) {
  const parametros = new URLSearchParams(busca);
  if (ano === maisRecente) parametros.delete("ano");
  else parametros.set("ano", String(ano));
  const texto = parametros.toString();
  return texto ? `?${texto}` : "";
}

/**
 * Cria o seletor de ano; `aoMudar` recebe o ano escolhido.
 * @example alvo.append(criarSeletorAno(anos, 2025, (ano) => desenhar(ano)))
 * @param {import("./dados.js").AnosPublicados} anos
 * @param {number} atual
 * @param {(ano: number) => void} aoMudar
 * @returns {HTMLElement}
 */
export function criarSeletorAno(anos, atual, aoMudar) {
  const opcoes = [...anos.anos].reverse().map((ano) => criar("option", { value: ano, selected: ano === atual }, String(ano)));
  const seletor = /** @type {HTMLSelectElement} */ (criar("select", {}, ...opcoes));
  seletor.addEventListener("change", () => {
    const ano = Number(seletor.value);
    history.replaceState(null, "", `${window.location.pathname}${urlComAno(window.location.search, ano, anos.mais_recente)}${window.location.hash}`);
    aoMudar(ano);
  });
  return criar("div", { class: "barra-ano" }, criar("label", {}, "Ano do Censo", seletor));
}
