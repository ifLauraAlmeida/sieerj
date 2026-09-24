// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Regras puras sobre séries anuais: extração por métrica, razões derivadas e variação.

/**
 * @typedef {{anos: number[], metricas: string[], estado: Array<Array<number|null>|null>,
 *   municipios: Record<string, {nome: string, valores: Array<Array<number|null>|null>}>}} SeriesAgregadas
 * @typedef {{id: string, rotulo: string, tipo: string, tabela: string, coluna: string, valor: number}} MetricaSerie
 * @typedef {{id: string, rotulo: string, tipo: string}} OpcaoMetrica
 */

export const METRICA_ESCOLAS_ATIVAS = "ESCOLAS_ATIVAS";
// Razões calculadas no site a partir de duas métricas publicadas.
export const RAZOES = {
  ALUNOS_POR_TURMA: { rotulo: "Alunos por turma", numerador: "QT_MAT_BAS", denominador: "QT_TUR_BAS" },
  ALUNOS_POR_DOCENTE: { rotulo: "Matrículas por docente", numerador: "QT_MAT_BAS", denominador: "QT_DOC_BAS" },
};

/**
 * Coluna de uma métrica numa tabela de linhas por ano (null se a linha ou o valor faltar).
 * @example colunaDaSerie([[1, 2], null], ["A", "B"], "B") // [2, null]
 * @param {Array<Array<number|null>|null>} linhas
 * @param {string[]} metricas
 * @param {string} id
 * @returns {Array<number|null>}
 */
export function colunaDaSerie(linhas, metricas, id) {
  const posicao = metricas.indexOf(id);
  if (posicao < 0) throw new Error(`Métrica "${id}" desconhecida (esperada uma de: ${metricas.join(", ")})`);
  return linhas.map((linha) => (linha ? linha[posicao] ?? null : null));
}

/**
 * Divide duas séries ano a ano, com null quando faltar dado ou o denominador for zero.
 * @example dividirSeries([60, 10], [2, 0]) // [30, null]
 * @param {Array<number|null>} numerador
 * @param {Array<number|null>} denominador
 * @returns {Array<number|null>}
 */
export function dividirSeries(numerador, denominador) {
  return numerador.map((valor, i) => (valor === null || !denominador[i] ? null : valor / /** @type {number} */ (denominador[i])));
}

/**
 * Valores de uma métrica (publicada ou razão derivada) numa tabela de linhas.
 * @example valoresDaMetrica(linhas, metricas, "ALUNOS_POR_TURMA")
 * @param {Array<Array<number|null>|null>} linhas
 * @param {string[]} metricas
 * @param {string} id
 * @returns {Array<number|null>}
 */
export function valoresDaMetrica(linhas, metricas, id) {
  const razao = RAZOES[id];
  if (!razao) return colunaDaSerie(linhas, metricas, id);
  return dividirSeries(colunaDaSerie(linhas, metricas, razao.numerador), colunaDaSerie(linhas, metricas, razao.denominador));
}

/**
 * Opções de métrica para seletores: métricas publicadas + razões derivadas.
 * @example opcoesDeMetrica(indicadores.metricas_serie, true)[0].id // "ESCOLAS_ATIVAS"
 * @param {MetricaSerie[]} metricas
 * @param {boolean} incluirEscolasAtivas
 * @returns {OpcaoMetrica[]}
 */
export function opcoesDeMetrica(metricas, incluirEscolasAtivas) {
  const razoes = Object.entries(RAZOES).map(([id, razao]) => ({ id, rotulo: razao.rotulo, tipo: "razao" }));
  const publicadas = metricas.map(({ id, rotulo, tipo }) => ({ id, rotulo: tipo === "infraestrutura" ? `% com ${minusculaInicial(rotulo)}` : rotulo, tipo }));
  const ativas = incluirEscolasAtivas ? [{ id: METRICA_ESCOLAS_ATIVAS, rotulo: "Escolas em atividade", tipo: "quantidade" }] : [];
  return [...ativas, ...publicadas.slice(0, 4), ...razoes, ...publicadas.slice(4)];
}

/**
 * Deixa só a primeira letra minúscula, preservando siglas ("Banheiro acessível (PNE)" → "banheiro acessível (PNE)").
 * @example minusculaInicial("Banheiro acessível (PNE)") // "banheiro acessível (PNE)"
 * @param {string} texto
 * @returns {string}
 */
export function minusculaInicial(texto) {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

/**
 * Primeiro e último valores não nulos e a variação percentual entre eles.
 * @example variacao([null, 100, 150]) // {inicio: 100, fim: 150, percentual: 50}
 * @param {Array<number|null>} valores
 * @returns {{inicio: number, fim: number, percentual: number|null}|null}
 */
export function variacao(valores) {
  const presentes = valores.filter((valor) => valor !== null);
  if (presentes.length < 2) return null;
  const [inicio, fim] = [presentes[0], presentes[presentes.length - 1]];
  return { inicio, fim, percentual: inicio ? ((fim - inicio) / inicio) * 100 : null };
}

/**
 * Reposiciona valores de anos esparsos (ex.: série de uma escola) nos anos publicados.
 * @example alinharAnos([2019, 2025], [[1], [2]], [2019, 2020, 2025]) // [[1], null, [2]]
 * @template T
 * @param {number[]} anosDaSerie
 * @param {T[]} linhas
 * @param {number[]} anosPublicados
 * @returns {Array<T|null>}
 */
export function alinharAnos(anosDaSerie, linhas, anosPublicados) {
  const porAno = new Map(anosDaSerie.map((ano, i) => [ano, linhas[i]]));
  return anosPublicados.map((ano) => porAno.get(ano) ?? null);
}
