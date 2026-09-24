// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Gráfico de linhas temporal em SVG: até 4 séries, com legenda, rótulos na ponta, dica e tabela.
// A paleta do README (azuis e cinzas) não separa séries só pela cor, então cada série
// também tem forma de marcador própria e rótulo direto (identidade nunca só pela cor).

import { criar } from "./dom.js";
import { criarTabela } from "./graficos.js";

const SVG = "http://www.w3.org/2000/svg";
// Largura do viewBox próxima da largura real evita texto gigante (tela larga) ou minúsculo (cartão).
export const LARGURA_CARTAO = 420;
export const LARGURA_AMPLA = 820;
const ALTURA = 260;
const MARGEM = { topo: 14, base: 28, esquerda: 56 };
// Espaço à direita para rótulos finais: só o valor (1 série) ou "nome: valor" (várias).
const DIREITA_UMA_SERIE = 56;
const DIREITA_VARIAS_SERIES = 150;
const FORMAS = ["circulo", "quadrado", "triangulo", "losango"];
export const MAXIMO_SERIES = FORMAS.length;
const DISTANCIA_MINIMA_ROTULOS = 14;

/**
 * @typedef {{nome: string, valores: Array<number|null>}} SerieLinha
 * @typedef {{anos: number[], series: SerieLinha[], formatar: (valor: number) => string, formatarEixo?: (valor: number) => string,
 *   maximo?: number, descricao: string, largura?: number}} OpcoesLinhas
 */

/**
 * Marcas "redondas" do eixo Y: 0 até um teto limpo acima do máximo.
 * @example ticksLimpos(87) // [0, 25, 50, 75, 100]
 * @param {number} maximo
 * @returns {number[]}
 */
export function ticksLimpos(maximo) {
  if (maximo <= 0) return [0, 1];
  const bruto = maximo / 4;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((fator) => fator * potencia).find((candidato) => candidato >= bruto) ?? potencia * 10;
  const ticks = [];
  for (let valor = 0; valor < maximo + passo; valor += passo) ticks.push(Number(valor.toPrecision(12)));
  return ticks;
}

/**
 * Caminho SVG que interrompe a linha nos anos sem dado.
 * @example caminhoComLacunas([[0, 10], null, [20, 5]]) // "M0 10 M20 5"
 * @param {Array<[number, number]|null>} pontos
 * @returns {string}
 */
export function caminhoComLacunas(pontos) {
  let comando = "M";
  const partes = [];
  for (const ponto of pontos) {
    if (!ponto) { comando = "M"; continue; }
    partes.push(`${comando}${ponto[0]} ${ponto[1]}`);
    comando = "L";
  }
  return partes.join(" ");
}

/**
 * Rótulos diretos só cabem se nenhum par ficar mais próximo que o mínimo (senão, só legenda).
 * @example rotulosCabem([10, 40, 45], 14) // false
 * @param {number[]} posicoes
 * @param {number} minimo
 * @returns {boolean}
 */
export function rotulosCabem(posicoes, minimo = DISTANCIA_MINIMA_ROTULOS) {
  const ordenadas = [...posicoes].sort((a, b) => a - b);
  return ordenadas.every((valor, i) => i === 0 || valor - ordenadas[i - 1] >= minimo);
}

function svg(tag, atributos = {}) {
  const elemento = document.createElementNS(SVG, tag);
  for (const [nome, valor] of Object.entries(atributos)) elemento.setAttribute(nome, String(valor));
  return elemento;
}

function criarEscalas(anos, teto, total, direita) {
  const largura = total - MARGEM.esquerda - direita;
  const altura = ALTURA - MARGEM.topo - MARGEM.base;
  const passo = anos.length > 1 ? largura / (anos.length - 1) : 0;
  return {
    total,
    fimX: total - direita,
    x: (indice) => MARGEM.esquerda + (anos.length > 1 ? indice * passo : largura / 2),
    y: (valor) => MARGEM.topo + altura - (valor / teto) * altura,
  };
}

function desenharEixos(grupo, anos, ticks, escalas, formatar) {
  for (const tick of ticks) {
    const y = escalas.y(tick);
    grupo.append(svg("line", { x1: MARGEM.esquerda, x2: escalas.fimX, y1: y, y2: y, class: "linha-grade" }));
    grupo.append(Object.assign(svg("text", { x: MARGEM.esquerda - 8, y: y + 4, class: "eixo-texto", "text-anchor": "end" }), { textContent: formatar(tick) }));
  }
  const intervalo = Math.ceil(anos.length / (escalas.total >= LARGURA_AMPLA ? 10 : 5));
  anos.forEach((ano, i) => {
    if (i % intervalo !== 0 && i !== anos.length - 1) return;
    grupo.append(Object.assign(svg("text", { x: escalas.x(i), y: ALTURA - 8, class: "eixo-texto", "text-anchor": "middle" }), { textContent: String(ano) }));
  });
}

function criarMarcador(forma, x, y, classe) {
  const r = 4.5;
  if (forma === "circulo") return svg("circle", { cx: x, cy: y, r, class: classe });
  if (forma === "quadrado") return svg("rect", { x: x - r, y: y - r, width: 2 * r, height: 2 * r, class: classe });
  const pontos = forma === "triangulo" ? [[x, y - r - 1], [x + r + 1, y + r], [x - r - 1, y + r]] : [[x, y - r - 1], [x + r + 1, y], [x, y + r + 1], [x - r - 1, y]];
  return svg("polygon", { points: pontos.map((p) => p.join(",")).join(" "), class: classe });
}

function desenharSerie(grupo, serie, indice, escalas) {
  const classe = `serie-${indice + 1}`;
  const pontos = serie.valores.map((valor, i) => (valor === null ? null : /** @type {[number, number]} */ ([escalas.x(i), escalas.y(valor)])));
  grupo.append(svg("path", { d: caminhoComLacunas(pontos), class: `linha-serie ${classe}` }));
  pontos.forEach((ponto) => ponto && grupo.append(criarMarcador(FORMAS[indice], ponto[0], ponto[1], `marcador ${classe}`)));
}

function ultimoPonto(serie) {
  for (let i = serie.valores.length - 1; i >= 0; i -= 1) if (serie.valores[i] !== null) return { i, valor: /** @type {number} */ (serie.valores[i]) };
  return null;
}

function desenharRotulosFinais(grupo, series, escalas, formatar) {
  const finais = series.map(ultimoPonto);
  if (!rotulosCabem(finais.filter(Boolean).map((f) => escalas.y(f.valor)))) return;
  finais.forEach((final, indice) => {
    if (!final) return;
    const texto = series.length > 1 ? `${series[indice].nome}: ${formatar(final.valor)}` : formatar(final.valor);
    const rotulo = svg("text", { x: escalas.x(final.i) + 10, y: escalas.y(final.valor) + 4, class: "rotulo-final" });
    grupo.append(Object.assign(rotulo, { textContent: texto.length > 22 ? `${texto.slice(0, 21)}…` : texto }));
  });
}

function textoDoAno(opcoes, indice) {
  const partes = opcoes.series.map((serie) => {
    const valor = serie.valores[indice];
    return `${serie.nome}: ${valor === null ? "sem dado" : opcoes.formatar(valor)}`;
  });
  return `${opcoes.anos[indice]} — ${partes.join(" · ")}`;
}

function criarMira(desenho, figura, opcoes, escalas) {
  const mira = svg("line", { y1: MARGEM.topo, y2: ALTURA - MARGEM.base, class: "mira", visibility: "hidden" });
  const dica = criar("div", { class: "dica-grafico", role: "status", "aria-live": "polite" });
  desenho.append(mira);
  figura.append(dica);
  const mostrar = (indice) => {
    for (const eixo of ["x1", "x2"]) mira.setAttribute(eixo, String(escalas.x(indice)));
    mira.setAttribute("visibility", "visible");
    dica.textContent = textoDoAno(opcoes, indice);
    dica.dataset.visivel = "sim";
  };
  const esconder = () => { mira.setAttribute("visibility", "hidden"); dica.dataset.visivel = "nao"; };
  return { mostrar, esconder };
}

function ligarInteracao(figura, desenho, opcoes, escalas) {
  const mira = criarMira(desenho, figura, opcoes, escalas);
  let atual = opcoes.anos.length - 1;
  const mostrar = (indice) => { atual = Math.max(0, Math.min(opcoes.anos.length - 1, indice)); mira.mostrar(atual); };
  ligarPonteiro(desenho, opcoes, escalas, mostrar, mira.esconder);
  figura.addEventListener("keydown", (evento) => {
    const passo = { ArrowRight: 1, ArrowLeft: -1 }[evento.key];
    if (passo) { evento.preventDefault(); mostrar(atual + passo); }
  });
  figura.addEventListener("focus", () => mostrar(atual));
  figura.addEventListener("blur", mira.esconder);
}

function ligarPonteiro(desenho, opcoes, escalas, mostrar, esconder) {
  desenho.addEventListener("pointermove", (evento) => {
    const caixa = desenho.getBoundingClientRect();
    const x = ((evento.clientX - caixa.left) / caixa.width) * escalas.total;
    const distancias = opcoes.anos.map((_, i) => Math.abs(escalas.x(i) - x));
    mostrar(distancias.indexOf(Math.min(...distancias)));
  });
  desenho.addEventListener("pointerleave", esconder);
}

function criarLegenda(series) {
  if (series.length < 2) return null;
  const itens = series.map((serie, i) => {
    const amostra = svg("svg", { width: 14, height: 14, viewBox: "0 0 14 14", "aria-hidden": "true" });
    amostra.append(criarMarcador(FORMAS[i], 7, 7, `marcador serie-${i + 1}`));
    return criar("li", {}, amostra, serie.nome);
  });
  return criar("ul", { class: "legenda-linhas" }, ...itens);
}

function criarTabelaSeries(opcoes) {
  const colunas = [{ rotulo: "Ano" }, ...opcoes.series.map((serie) => ({ rotulo: serie.nome, numero: true }))];
  const linhas = opcoes.anos.map((ano, i) => [String(ano), ...opcoes.series.map((serie) => (serie.valores[i] === null ? "—" : opcoes.formatar(/** @type {number} */ (serie.valores[i]))))]);
  return criar("details", { class: "tabela-grafico" }, criar("summary", {}, "Ver tabela"), criarTabela(colunas, linhas));
}

/**
 * Cria o gráfico de linhas completo (legenda, SVG, dica e tabela).
 * @example criarGraficoLinhas({anos: [2019, 2020], series: [{nome: "RJ", valores: [1, 2]}], formatar: String, descricao: "Matrículas"})
 * @param {OpcoesLinhas} opcoes
 * @returns {HTMLElement}
 */
export function criarGraficoLinhas(opcoes) {
  const valores = opcoes.series.flatMap((serie) => serie.valores).filter((valor) => valor !== null);
  const ticks = ticksLimpos(opcoes.maximo ?? Math.max(0, ...valores));
  const largura = opcoes.largura ?? LARGURA_CARTAO;
  const escalas = criarEscalas(opcoes.anos, ticks[ticks.length - 1], largura, opcoes.series.length > 1 ? DIREITA_VARIAS_SERIES : DIREITA_UMA_SERIE);
  const desenho = svg("svg", { viewBox: `0 0 ${largura} ${ALTURA}`, style: `max-width:${largura * 1.25}px`, class: "grafico-linhas", role: "img", "aria-label": opcoes.descricao });
  desenharEixos(desenho, opcoes.anos, ticks, escalas, opcoes.formatarEixo ?? opcoes.formatar);
  opcoes.series.forEach((serie, i) => desenharSerie(desenho, serie, i, escalas));
  desenharRotulosFinais(desenho, opcoes.series, escalas, opcoes.formatar);
  const figura = criar("figure", { class: "figura-linhas", tabindex: 0, "aria-label": `${opcoes.descricao}. Use as setas para percorrer os anos.` });
  figura.append(desenho);
  ligarInteracao(figura, desenho, opcoes, escalas);
  return criar("div", {}, criarLegenda(opcoes.series), figura, valores.length ? null : criar("p", { class: "vazio" }, "Sem dados para este indicador nos anos publicados."), criarTabelaSeries(opcoes));
}
