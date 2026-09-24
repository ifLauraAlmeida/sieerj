// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Tabela ordenável e filtrável com os 92 municípios do RJ.

import { criar, substituir } from "./dom.js";
import { formatarDecimal, formatarNumero, normalizarTexto } from "./formato.js";
import { calcularRazao, percentuaisInfraestrutura } from "./painel.js";

/**
 * @typedef {{codigo: string, nome: string, escolas: number, matriculas: number, turmas: number, docentes: number,
 *   alunosPorTurma: number, internet: number}} LinhaMunicipio
 */

const COLUNAS = [
  { chave: "nome", rotulo: "Município", numero: false },
  { chave: "escolas", rotulo: "Escolas em atividade", numero: true },
  { chave: "matriculas", rotulo: "Matrículas", numero: true },
  { chave: "turmas", rotulo: "Turmas", numero: true },
  { chave: "docentes", rotulo: "Docentes", numero: true },
  { chave: "alunosPorTurma", rotulo: "Alunos por turma", numero: true },
  { chave: "internet", rotulo: "% escolas com internet", numero: true },
];

/**
 * Resume cada município numa linha da tabela.
 * @example linhasMunicipios(panorama.municipios)[0].nome // "Angra dos Reis"
 * @param {Record<string, import("./painel.js").Agregado>} municipios
 * @returns {LinhaMunicipio[]}
 */
export function linhasMunicipios(municipios) {
  return Object.entries(municipios).map(([codigo, agregado]) => ({
    codigo,
    nome: agregado.nome,
    escolas: agregado.em_atividade,
    matriculas: agregado.totais.matriculas,
    turmas: agregado.totais.turmas,
    docentes: agregado.totais.docentes,
    alunosPorTurma: calcularRazao(agregado.totais.matriculas, agregado.totais.turmas),
    // Internet é o primeiro indicador de infraestrutura (pipeline/indicadores.py).
    internet: percentuaisInfraestrutura(agregado)[0],
  }));
}

/**
 * Ordena as linhas por uma coluna; textos em ordem alfabética pt-BR.
 * @example ordenarLinhas(linhas, "matriculas", "descending")[0].nome // "Rio de Janeiro"
 * @param {LinhaMunicipio[]} linhas
 * @param {keyof LinhaMunicipio} chave
 * @param {"ascending"|"descending"} direcao
 * @returns {LinhaMunicipio[]}
 */
export function ordenarLinhas(linhas, chave, direcao) {
  const sinal = direcao === "ascending" ? 1 : -1;
  const comparar = (a, b) => (typeof a[chave] === "string" ? String(a[chave]).localeCompare(String(b[chave]), "pt-BR") : Number(a[chave]) - Number(b[chave]));
  return [...linhas].sort((a, b) => sinal * comparar(a, b));
}

function formatarCelula(linha, chave, ano) {
  if (chave === "nome") return criar("a", { href: `municipio.html?codigo=${linha.codigo}&ano=${ano}` }, linha.nome);
  if (chave === "alunosPorTurma") return formatarDecimal(linha.alunosPorTurma);
  if (chave === "internet") return `${formatarDecimal(linha.internet)}%`;
  return formatarNumero(Number(linha[chave]));
}

function criarCabecalho(estado, aoOrdenar) {
  const celulas = COLUNAS.map((coluna) => {
    const botao = criar("button", { type: "button" }, coluna.rotulo);
    botao.addEventListener("click", () => aoOrdenar(coluna.chave));
    const ordem = estado.chave === coluna.chave ? estado.direcao : undefined;
    return criar("th", { scope: "col", class: coluna.numero ? "numero" : undefined, "aria-sort": ordem }, botao);
  });
  return criar("thead", {}, criar("tr", {}, ...celulas));
}

function criarCorpo(linhas, ano) {
  const classe = (coluna) => (coluna.numero ? "numero" : undefined);
  return criar("tbody", {}, ...linhas.map((linha) => criar("tr", {}, ...COLUNAS.map((coluna) => criar("td", { class: classe(coluna) }, formatarCelula(linha, coluna.chave, ano))))));
}

/**
 * Monta a tabela interativa de municípios dentro de `alvo`.
 * @example montarTabelaMunicipios(document.getElementById("tabela-municipios"), panorama.municipios, 2025)
 * @param {HTMLElement} alvo
 * @param {Record<string, import("./painel.js").Agregado>} municipios
 * @param {number} ano
 * @returns {void}
 */
export function montarTabelaMunicipios(alvo, municipios, ano) {
  const todas = linhasMunicipios(municipios);
  const estado = { chave: "matriculas", direcao: /** @type {"ascending"|"descending"} */ ("descending"), filtro: "" };
  const filtro = criar("input", { type: "search", placeholder: "Filtrar município", "aria-label": "Filtrar município" });
  const tabela = criar("table", {});
  const desenhar = () => {
    const visiveis = todas.filter((linha) => normalizarTexto(linha.nome).includes(normalizarTexto(estado.filtro)));
    substituir(tabela, criarCabecalho(estado, ordenarPor), criarCorpo(ordenarLinhas(visiveis, estado.chave, estado.direcao), ano));
  };
  const ordenarPor = (chave) => {
    estado.direcao = estado.chave === chave && estado.direcao === "descending" ? "ascending" : "descending";
    estado.chave = chave;
    desenhar();
  };
  filtro.addEventListener("input", () => { estado.filtro = /** @type {HTMLInputElement} */ (filtro).value; desenhar(); });
  desenhar();
  substituir(alvo, criar("div", { class: "cartao" }, criar("div", { style: "max-width:320px;margin-bottom:12px" }, filtro), criar("div", { class: "tabela-rolagem" }, tabela)));
}
