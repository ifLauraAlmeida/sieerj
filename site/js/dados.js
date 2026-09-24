// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Acesso aos JSON gerados pelo pipeline (pasta site/dados, camada ouro).

/**
 * @typedef {(url: string) => Promise<Response>} BuscadorHttp
 * @typedef {{anos: number[], mais_recente: number, lotes_fichas: number}} AnosPublicados
 * @typedef {{dicionario: import("./formato.js").Dicionario, indicadores: import("./painel.js").Indicadores,
 *   anos: AnosPublicados}} DadosBase
 * @typedef {Record<string, number|string>} LinhaCenso
 * @typedef {{escola: LinhaCenso, matricula: LinhaCenso, turma: LinhaCenso, docente: LinhaCenso, gestor: LinhaCenso,
 *   cursos_tecnicos: LinhaCenso[]}} Ficha
 * @typedef {{anos: number[], valores: Array<Array<number|null>>}} SerieEscola
 * @typedef {{ano: number, ficha: Ficha, serie: SerieEscola}} EscolaPublicada
 */

const cache = new Map();

/**
 * Carrega um JSON relativo à pasta de dados, reaproveitando requisições repetidas.
 * O buscador é injetável para permitir testes sem rede.
 * @example const anos = await carregarJson("anos.json");
 * @param {string} caminho
 * @param {BuscadorHttp} buscador
 * @returns {Promise<unknown>}
 */
export function carregarJson(caminho, buscador = (url) => fetch(url)) {
  if (!cache.has(caminho)) cache.set(caminho, buscarJson(`dados/${caminho}`, buscador));
  return cache.get(caminho);
}

async function buscarJson(url, buscador) {
  const resposta = await buscador(url);
  if (!resposta.ok) {
    throw new Error(`Falha ao carregar ${url}: HTTP ${resposta.status} (esperado 200 com JSON gerado por "make dados")`);
  }
  return resposta.json();
}

/**
 * Carrega dicionário, indicadores e anos publicados, usados por todas as páginas.
 * @example const {dicionario, indicadores, anos} = await carregarBase();
 * @returns {Promise<DadosBase>}
 */
export async function carregarBase() {
  const [dicionario, indicadores, anos] = await Promise.all(["dicionario.json", "indicadores.json", "anos.json"].map((nome) => carregarJson(nome)));
  return /** @type {DadosBase} */ ({ dicionario, indicadores, anos });
}

/**
 * Carrega o panorama (estado e municípios) de um ano publicado.
 * @example await carregarPanorama(2024)
 * @param {number} ano
 * @returns {Promise<import("./painel.js").Panorama>}
 */
export async function carregarPanorama(ano) {
  return /** @type {import("./painel.js").Panorama} */ (await carregarJson(`panoramas/${ano}.json`));
}

/**
 * Carrega as séries anuais do estado e dos municípios.
 * @example (await carregarSeries()).anos
 * @returns {Promise<import("./serie.js").SeriesAgregadas>}
 */
export async function carregarSeries() {
  return /** @type {import("./serie.js").SeriesAgregadas} */ (await carregarJson("series.json"));
}

/**
 * Escolhe o ano pedido na URL se publicado; senão, o mais recente.
 * @example anoValido("2019", {anos: [2019, 2025], mais_recente: 2025, lotes_fichas: 256}) // 2019
 * @param {string} texto
 * @param {AnosPublicados} anos
 * @returns {number}
 */
export function anoValido(texto, anos) {
  const ano = Number(texto);
  return anos.anos.includes(ano) ? ano : anos.mais_recente;
}

/**
 * Lote (arquivo escolas/<lote>.json) que guarda a escola; mesma conta de pipeline/publicacao.py.
 * @example loteDaEscola("33036594", 256) // 50
 * @param {string} codigo
 * @param {number} totalLotes
 * @returns {number}
 */
export function loteDaEscola(codigo, totalLotes) {
  return Number(codigo) % totalLotes;
}

/**
 * Carrega a escola (ficha do último ano em que aparece + série histórica) pelo código INEP.
 * @example await carregarEscola("33036594", anos.lotes_fichas)
 * @param {string} codigo
 * @param {number} totalLotes
 * @param {BuscadorHttp} [buscador]
 * @returns {Promise<EscolaPublicada>}
 */
export async function carregarEscola(codigo, totalLotes, buscador) {
  if (!/^\d{8}$/.test(codigo)) throw new Error(`Código INEP inválido: "${codigo}" (esperado 8 dígitos, ex.: 33036594)`);
  const lote = /** @type {Record<string, EscolaPublicada>} */ (await carregarJson(`escolas/${loteDaEscola(codigo, totalLotes)}.json`, buscador));
  if (!(codigo in lote)) throw new Error(`Escola ${codigo} não encontrada no Censo (esperado código INEP de escola do RJ)`);
  return lote[codigo];
}
