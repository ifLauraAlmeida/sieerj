// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Aba "Histórico" da ficha: evolução da escola ano a ano e grade de infraestrutura por ano.

import { criar } from "./dom.js";
import { FIXAS_ESCOLA, criarEvolucao } from "./evolucao.js";
import { criarCartao, criarTabela } from "./graficos.js";
import { alinharAnos, opcoesDeMetrica } from "./serie.js";

/**
 * Símbolo de um indicador de infraestrutura no ano: possui, não possui ou sem dado.
 * @example simboloInfra(1) // "✓"
 * @param {number|null} valor
 * @returns {string}
 */
export function simboloInfra(valor) {
  if (valor === null) return "·";
  return valor === 1 ? "✓" : "–";
}

function criarGradeInfraestrutura(serie, metricas) {
  const infra = metricas.map((metrica, posicao) => ({ metrica, posicao })).filter(({ metrica }) => metrica.tipo === "infraestrutura");
  const colunas = [{ rotulo: "Item" }, ...serie.anos.map((ano) => ({ rotulo: String(ano) }))];
  const linhas = infra.map(({ metrica, posicao }) => [metrica.rotulo, ...serie.valores.map((linha) => simboloInfra(linha[posicao]))]);
  const nota = "✓ possui · – não possui · ponto: sem dado no ano (variável não coletada ou escola sem atividade).";
  return criarCartao("Infraestrutura ano a ano", criarTabela(colunas, linhas), nota);
}

/**
 * Monta a aba Histórico a partir da série publicada da escola.
 * @example painel.append(...criarHistoricoEscola(escola.serie, "CE NAZIRA SALOMAO", base))
 * @param {import("./dados.js").SerieEscola} serie
 * @param {string} nome
 * @param {import("./dados.js").DadosBase} base
 * @returns {HTMLElement[]}
 */
export function criarHistoricoEscola(serie, nome, { indicadores, anos }) {
  const metricas = indicadores.metricas_serie;
  const opcoes = opcoesDeMetrica(metricas, false).filter((opcao) => opcao.tipo !== "infraestrutura");
  const linhas = alinharAnos(serie.anos, serie.valores, anos.anos);
  const contexto = { anos: anos.anos, metricas: metricas.map((m) => m.id), principal: { nome, linhas }, opcoes, fixas: FIXAS_ESCOLA };
  const presenca = `Presente em ${serie.anos.length} de ${anos.anos.length} Censos publicados (${serie.anos[0]}–${serie.anos[serie.anos.length - 1]}).`;
  return [criar("p", { class: "subtitulo" }, presenca), criarEvolucao(contexto), criarGradeInfraestrutura(serie, metricas)];
}
