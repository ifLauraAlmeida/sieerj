// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Formatação de números, datas e rótulos vindos do dicionário do INEP.

/** @typedef {{descricao: string, categorias: Record<string, string>, anos_coleta?: number[]}} VariavelDicionario */
/** @typedef {Record<string, VariavelDicionario>} Dicionario */

const formatoInteiro = new Intl.NumberFormat("pt-BR");
const formatoCompacto = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const formatoDecimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

// O INEP marca com 88888 quantidades de profissionais acima do limite plausível (ver dicionário, QT_PROF_*).
export const VALOR_EXTREMO_INEP = 88888;

const MESES = { JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06", JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12" };

/**
 * Formata inteiro no padrão brasileiro.
 * @example formatarNumero(3319771) // "3.319.771"
 * @param {number} valor
 * @returns {string}
 */
export function formatarNumero(valor) {
  return formatoInteiro.format(valor);
}

/**
 * Formata número grande de forma curta, para indicadores de destaque.
 * @example formatarCompacto(3319771) // "3,3 mi"
 * @param {number} valor
 * @returns {string}
 */
export function formatarCompacto(valor) {
  return valor < 10000 ? formatoInteiro.format(valor) : formatoCompacto.format(valor);
}

/**
 * Formata decimal com uma casa.
 * @example formatarDecimal(22.456) // "22,5"
 * @param {number} valor
 * @returns {string}
 */
export function formatarDecimal(valor) {
  return formatoDecimal.format(valor);
}

/**
 * Calcula parte/total em percentual, devolvendo 0 quando o total é zero.
 * @example calcularPercentual(1, 4) // 25
 * @param {number} parte
 * @param {number} total
 * @returns {number}
 */
export function calcularPercentual(parte, total) {
  return total > 0 ? (parte / total) * 100 : 0;
}

/**
 * Formata percentual com uma casa decimal.
 * @example formatarPercentual(1, 3) // "33,3%"
 * @param {number} parte
 * @param {number} total
 * @returns {string}
 */
export function formatarPercentual(parte, total) {
  return `${formatoDecimal.format(calcularPercentual(parte, total))}%`;
}

/**
 * Converte datas do INEP ("06FEB2025:00:00:00") em "06/02/2025".
 * @example formatarDataInep("06FEB2025:00:00:00") // "06/02/2025"
 * @param {string} texto
 * @returns {string}
 */
export function formatarDataInep(texto) {
  const partes = /^(\d{2})([A-Z]{3})(\d{4})/.exec(texto);
  if (!partes || !(partes[2] in MESES)) return texto;
  return `${partes[1]}/${MESES[partes[2]]}/${partes[3]}`;
}

/**
 * Traduz o código de uma variável categórica para o rótulo do dicionário.
 * @example rotuloCategoria(dicionario, "TP_DEPENDENCIA", 2) // "Estadual"
 * @param {Dicionario} dicionario
 * @param {string} variavel
 * @param {number|string} codigo
 * @returns {string}
 */
export function rotuloCategoria(dicionario, variavel, codigo) {
  const categorias = dicionario[variavel]?.categorias ?? {};
  return categorias[String(codigo)] ?? String(codigo);
}

/**
 * Separa a descrição do INEP em grupo e item no primeiro " - ".
 * @example dividirDescricao("Dependências físicas - Banheiro") // {grupo: "Dependências físicas", item: "Banheiro"}
 * @param {string} descricao
 * @returns {{grupo: string, item: string}}
 */
export function dividirDescricao(descricao) {
  const posicao = descricao.indexOf(" - ");
  if (posicao < 0) return { grupo: "", item: descricao };
  return { grupo: descricao.slice(0, posicao).trim(), item: descricao.slice(posicao + 3).trim() };
}

/**
 * Descrição legível de uma variável, com o nome técnico como alternativa.
 * @example descreverVariavel(dicionario, "QT_MAT_BAS") // "Número de Matrículas da Educação Básica"
 * @param {Dicionario} dicionario
 * @param {string} variavel
 * @returns {string}
 */
export function descreverVariavel(dicionario, variavel) {
  return dicionario[variavel]?.descricao || variavel;
}

/**
 * Formata o valor de um campo da ficha conforme o tipo da variável.
 * @example formatarCampo(dicionario, "TP_LOCALIZACAO", 1) // "Urbana"
 * @param {Dicionario} dicionario
 * @param {string} variavel
 * @param {number|string} valor
 * @returns {string}
 */
export function formatarCampo(dicionario, variavel, valor) {
  if (variavel.startsWith("DT_")) return formatarDataInep(String(valor));
  if (valor === VALOR_EXTREMO_INEP) return "Valor extremo (sinalizado pelo INEP)";
  if (Object.keys(dicionario[variavel]?.categorias ?? {}).length > 0) return rotuloCategoria(dicionario, variavel, valor);
  // Códigos e anos (NU_ANO_CENSO) são identificadores: "2025", nunca "2.025".
  if (typeof valor === "number" && !variavel.startsWith("CO_") && !variavel.startsWith("NU_ANO")) return formatarNumero(valor);
  return String(valor);
}

/**
 * Normaliza texto para busca: minúsculas e sem acentos.
 * @example normalizarTexto("São Gonçalo") // "sao goncalo"
 * @param {string} texto
 * @returns {string}
 */
export function normalizarTexto(texto) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
