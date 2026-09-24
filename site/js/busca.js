// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Regras puras de busca, filtro e paginação sobre o índice de escolas.

import { normalizarTexto } from "./formato.js";

/**
 * @typedef {{codigo: number, nome: string, municipio: number, dependencia: number, localizacao: number,
 *   situacao: number, matriculas: number, turmas: number, docentes: number, etapas: string[], nomeBusca: string, ano?: number}} EscolaIndice
 * @typedef {{colunas: string[], linhas: Array<Array<number|string>>, municipios: Record<string, string>, ano: number}} IndiceJson
 * @typedef {{texto: string, municipio: string, dependencia: string, localizacao: string, situacao: string, etapa: string}} FiltrosBusca
 */

export const CAMPOS_FILTRO = ["texto", "municipio", "dependencia", "localizacao", "situacao", "etapa"];
export const TAMANHO_PAGINA = 25;

/**
 * Converte as linhas compactas do índice em objetos nomeados.
 * @example linhasParaEscolas({colunas: ["codigo", "nome", "etapas"], linhas: [[1, "A", "CRE"]]})
 * @param {IndiceJson} indice
 * @returns {EscolaIndice[]}
 */
export function linhasParaEscolas(indice) {
  return indice.linhas.map((linha) => {
    const escola = Object.fromEntries(indice.colunas.map((coluna, posicao) => [coluna, linha[posicao]]));
    escola.etapas = escola.etapas ? String(escola.etapas).split(",") : [];
    escola.nomeBusca = normalizarTexto(String(escola.nome));
    return /** @type {EscolaIndice} */ (escola);
  });
}

/**
 * Lê os filtros da URL, preenchendo ausentes com "".
 * @example filtrosDaUrl(new URLSearchParams("texto=pedro&etapa=MED")).etapa // "MED"
 * @param {URLSearchParams} parametros
 * @returns {FiltrosBusca}
 */
export function filtrosDaUrl(parametros) {
  return /** @type {FiltrosBusca} */ (Object.fromEntries(CAMPOS_FILTRO.map((campo) => [campo, parametros.get(campo) ?? ""])));
}

/**
 * Serializa os filtros não vazios para a query string.
 * @example filtrosParaUrl({texto: "a", municipio: "", ...}) // "texto=a"
 * @param {FiltrosBusca} filtros
 * @returns {string}
 */
export function filtrosParaUrl(filtros) {
  const parametros = new URLSearchParams();
  for (const campo of CAMPOS_FILTRO) {
    if (filtros[campo]) parametros.set(campo, filtros[campo]);
  }
  return parametros.toString();
}

/**
 * Verifica se a escola atende ao texto buscado (nome ou código INEP).
 * @example atendeTexto(escola, "nazira") // true
 * @param {EscolaIndice} escola
 * @param {string} texto
 * @returns {boolean}
 */
export function atendeTexto(escola, texto) {
  const termos = normalizarTexto(texto).split(/\s+/).filter(Boolean);
  if (termos.length === 1 && /^\d+$/.test(termos[0])) return String(escola.codigo).startsWith(termos[0]);
  return termos.every((termo) => escola.nomeBusca.includes(termo));
}

/**
 * Verifica se a escola atende a todos os filtros preenchidos.
 * @example atendeFiltros(escola, {texto: "", municipio: "3304557", ...}) // true
 * @param {EscolaIndice} escola
 * @param {FiltrosBusca} filtros
 * @returns {boolean}
 */
export function atendeFiltros(escola, filtros) {
  if (filtros.texto && !atendeTexto(escola, filtros.texto)) return false;
  if (filtros.municipio && String(escola.municipio) !== filtros.municipio) return false;
  if (filtros.dependencia && String(escola.dependencia) !== filtros.dependencia) return false;
  if (filtros.localizacao && String(escola.localizacao) !== filtros.localizacao) return false;
  if (filtros.situacao && String(escola.situacao) !== filtros.situacao) return false;
  return !filtros.etapa || escola.etapas.includes(filtros.etapa);
}

/**
 * Filtra a lista de escolas.
 * @example filtrarEscolas(escolas, filtrosDaUrl(new URLSearchParams("etapa=EJA"))).length
 * @param {EscolaIndice[]} escolas
 * @param {FiltrosBusca} filtros
 * @returns {EscolaIndice[]}
 */
export function filtrarEscolas(escolas, filtros) {
  return escolas.filter((escola) => atendeFiltros(escola, filtros));
}

/**
 * Recorta uma página da lista, limitando o número da página ao intervalo válido.
 * @example paginar([1, 2, 3], 2, 2) // {itens: [3], pagina: 2, totalPaginas: 2}
 * @template T
 * @param {T[]} lista
 * @param {number} pagina
 * @param {number} tamanho
 * @returns {{itens: T[], pagina: number, totalPaginas: number}}
 */
export function paginar(lista, pagina, tamanho = TAMANHO_PAGINA) {
  const totalPaginas = Math.max(1, Math.ceil(lista.length / tamanho));
  const atual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (atual - 1) * tamanho;
  return { itens: lista.slice(inicio, inicio + tamanho), pagina: atual, totalPaginas };
}
