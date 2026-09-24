// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Regras puras da página Comparar: seleção na URL, adição/remoção e sugestões de busca.

import { atendeTexto } from "./busca.js";
import { normalizarTexto } from "./formato.js";
import { MAXIMO_SERIES } from "./graficos-linha.js";

/** @typedef {{tipo: "escola"|"municipio", ids: string[], metrica: string}} SelecaoComparacao */

export const TIPOS = { escola: "Escolas", municipio: "Municípios" };
const LIMITE_SUGESTOES = 8;

/**
 * Lê a seleção da URL, descartando ids repetidos e excedentes.
 * @example lerSelecao(new URLSearchParams("tipo=municipio&ids=1,2,2")) // {tipo: "municipio", ids: ["1", "2"], metrica: ""}
 * @param {URLSearchParams} parametros
 * @returns {SelecaoComparacao}
 */
export function lerSelecao(parametros) {
  const tipo = parametros.get("tipo") === "escola" ? "escola" : "municipio";
  const ids = [...new Set((parametros.get("ids") ?? "").split(",").map((id) => id.trim()).filter((id) => /^\d+$/.test(id)))];
  return { tipo, ids: ids.slice(0, MAXIMO_SERIES), metrica: parametros.get("metrica") ?? "" };
}

/**
 * Serializa a seleção para a query string.
 * @example selecaoParaUrl({tipo: "escola", ids: ["1"], metrica: "QT_MAT_BAS"}) // "tipo=escola&ids=1&metrica=QT_MAT_BAS"
 * @param {SelecaoComparacao} selecao
 * @returns {string}
 */
export function selecaoParaUrl(selecao) {
  const parametros = new URLSearchParams({ tipo: selecao.tipo });
  if (selecao.ids.length) parametros.set("ids", selecao.ids.join(","));
  if (selecao.metrica) parametros.set("metrica", selecao.metrica);
  return parametros.toString().replaceAll("%2C", ",");
}

/**
 * Adiciona um id respeitando o limite de séries e sem repetir.
 * @example adicionarId(["1"], "2") // ["1", "2"]
 * @param {string[]} ids
 * @param {string} id
 * @returns {string[]}
 */
export function adicionarId(ids, id) {
  if (ids.includes(id) || ids.length >= MAXIMO_SERIES) return ids;
  return [...ids, id];
}

/**
 * Sugere municípios pelo nome, ignorando acentos e já selecionados.
 * @example sugerirMunicipios({3304557: "Rio de Janeiro"}, "rio", []) // [{id: "3304557", nome: "Rio de Janeiro", detalhe: ""}]
 * @param {Record<string, string>} municipios
 * @param {string} texto
 * @param {string[]} selecionados
 * @returns {Array<{id: string, nome: string, detalhe: string}>}
 */
export function sugerirMunicipios(municipios, texto, selecionados) {
  const termo = normalizarTexto(texto);
  if (!termo) return [];
  return Object.entries(municipios)
    .filter(([id, nome]) => !selecionados.includes(id) && normalizarTexto(nome).includes(termo))
    .slice(0, LIMITE_SUGESTOES)
    .map(([id, nome]) => ({ id, nome, detalhe: "" }));
}

/**
 * Sugere escolas por nome ou código INEP, com o município como detalhe.
 * @example sugerirEscolas(escolas, {3300100: "Angra dos Reis"}, "nazira", [])[0].detalhe // "Angra dos Reis · INEP 33036594"
 * @param {import("./busca.js").EscolaIndice[]} escolas
 * @param {Record<string, string>} municipios
 * @param {string} texto
 * @param {string[]} selecionados
 * @returns {Array<{id: string, nome: string, detalhe: string}>}
 */
export function sugerirEscolas(escolas, municipios, texto, selecionados) {
  if (normalizarTexto(texto).length < 3) return [];
  return escolas
    .filter((escola) => !selecionados.includes(String(escola.codigo)) && atendeTexto(escola, texto))
    .slice(0, LIMITE_SUGESTOES)
    .map((escola) => ({ id: String(escola.codigo), nome: escola.nome, detalhe: `${municipios[String(escola.municipio)] ?? ""} · INEP ${escola.codigo}` }));
}
