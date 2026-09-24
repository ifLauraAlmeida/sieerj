// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Seção "Evolução": gráficos anuais de estado, município ou escola, com seletor de indicador.

import { criar, substituir } from "./dom.js";
import { formatarCompacto, formatarDecimal, formatarNumero } from "./formato.js";
import { criarCartao } from "./graficos.js";
import { criarGraficoLinhas } from "./graficos-linha.js";
import { METRICA_ESCOLAS_ATIVAS, opcoesDeMetrica, valoresDaMetrica, variacao } from "./serie.js";

/**
 * @typedef {{nome: string, linhas: Array<Array<number|null>|null>}} FonteSerie
 * @typedef {{anos: number[], metricas: string[], principal: FonteSerie, referencia?: FonteSerie,
 *   opcoes: import("./serie.js").OpcaoMetrica[], fixas: string[]}} ContextoEvolucao
 */

/**
 * Formatadores de valor e de eixo conforme o tipo da métrica.
 * @example formatadoresDoTipo("infraestrutura").formatar(42.5) // "42,5%"
 * @param {string} tipo
 * @returns {{formatar: (v: number) => string, formatarEixo: (v: number) => string, maximo?: number}}
 */
export function formatadoresDoTipo(tipo) {
  if (tipo === "infraestrutura") return { formatar: (v) => `${formatarDecimal(v)}%`, formatarEixo: (v) => `${v}%`, maximo: 100 };
  if (tipo === "razao") return { formatar: formatarDecimal, formatarEixo: formatarDecimal };
  return { formatar: formatarNumero, formatarEixo: formatarCompacto };
}

/**
 * Texto de variação entre o primeiro e o último ano com dado.
 * @example textoVariacao([10, null, 15], [2019, 2020, 2021], formatarNumero) // "2019 → 2021: 10 → 15 (+50%)"
 * @param {Array<number|null>} valores
 * @param {number[]} anos
 * @param {(v: number) => string} formatar
 * @returns {string}
 */
export function textoVariacao(valores, anos, formatar) {
  const resumo = variacao(valores);
  if (!resumo) return "";
  const primeiro = anos[valores.indexOf(resumo.inicio)];
  const ultimo = anos[valores.lastIndexOf(resumo.fim)];
  const percentual = resumo.percentual === null ? "" : ` (${resumo.percentual >= 0 ? "+" : ""}${formatarDecimal(resumo.percentual)}%)`;
  return `${primeiro} → ${ultimo}: ${formatar(resumo.inicio)} → ${formatar(resumo.fim)}${percentual}`;
}

function seriesDoGrafico(contexto, opcao) {
  const principal = { nome: contexto.principal.nome, valores: valoresDaMetrica(contexto.principal.linhas, contexto.metricas, opcao.id) };
  // Quantidades absolutas do estado esmagariam a escala do município; referência só para % e razões.
  const comparavel = opcao.tipo !== "quantidade" && contexto.referencia;
  if (!comparavel) return [principal];
  return [principal, { nome: contexto.referencia.nome, valores: valoresDaMetrica(contexto.referencia.linhas, contexto.metricas, opcao.id) }];
}

/**
 * Gráfico de uma métrica, com a variação do período.
 * @example criarGraficoMetrica(contexto, contexto.opcoes[0])
 * @param {ContextoEvolucao} contexto
 * @param {import("./serie.js").OpcaoMetrica} opcao
 * @returns {HTMLElement}
 */
export function criarGraficoMetrica(contexto, opcao) {
  const formatadores = formatadoresDoTipo(opcao.tipo);
  const series = seriesDoGrafico(contexto, opcao);
  const resumo = textoVariacao(series[0].valores, contexto.anos, formatadores.formatar);
  const grafico = criarGraficoLinhas({ anos: contexto.anos, series, ...formatadores, descricao: `${opcao.rotulo} por ano` });
  return criar("div", {}, resumo ? criar("p", { class: "variacao" }, resumo) : null, grafico);
}

function criarCartaoSelecionavel(contexto) {
  const seletor = criar("select", { "aria-label": "Indicador" }, ...contexto.opcoes.map((opcao) => criar("option", { value: opcao.id }, opcao.rotulo)));
  const alvo = criar("div", {});
  const desenhar = () => {
    const opcao = contexto.opcoes.find((item) => item.id === /** @type {HTMLSelectElement} */ (seletor).value) ?? contexto.opcoes[0];
    substituir(alvo, criarGraficoMetrica(contexto, opcao));
  };
  const padrao = contexto.opcoes.find((o) => o.tipo === "infraestrutura") ?? contexto.opcoes.find((o) => !contexto.fixas.includes(o.id)) ?? contexto.opcoes[0];
  /** @type {HTMLSelectElement} */ (seletor).value = padrao.id;
  seletor.addEventListener("change", desenhar);
  desenhar();
  return criar("section", { class: "cartao" }, criar("h3", {}, "Escolha um indicador"), criar("div", { style: "margin-bottom:12px" }, seletor), alvo);
}

/**
 * Seção de evolução: cartões fixos + um cartão com seletor de indicador.
 * @example main.append(criarEvolucao({anos, metricas, principal: {nome: "RJ", linhas}, opcoes, fixas: ["QT_MAT_BAS"]}))
 * @param {ContextoEvolucao} contexto
 * @returns {HTMLElement}
 */
export function criarEvolucao(contexto) {
  const fixas = contexto.fixas.map((id) => contexto.opcoes.find((opcao) => opcao.id === id)).filter(Boolean);
  const cartoes = fixas.map((opcao) => criarCartao(opcao.rotulo, criarGraficoMetrica(contexto, opcao)));
  return criar("div", { class: "grade" }, ...cartoes, criarCartaoSelecionavel(contexto));
}

/**
 * Opções de métrica para agregados (inclui escolas em atividade).
 * @example opcoesAgregadas(indicadores)[0].id // "ESCOLAS_ATIVAS"
 * @param {import("./painel.js").Indicadores} indicadores
 * @returns {import("./serie.js").OpcaoMetrica[]}
 */
export function opcoesAgregadas(indicadores) {
  return opcoesDeMetrica(indicadores.metricas_serie, true);
}

export const FIXAS_AGREGADO = [METRICA_ESCOLAS_ATIVAS, "QT_MAT_BAS", "ALUNOS_POR_TURMA"];
export const FIXAS_ESCOLA = ["QT_MAT_BAS", "QT_TUR_BAS", "ALUNOS_POR_TURMA"];
