// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Renderização dos campos da ficha: listas Sim/Não, campos descritos e tabelas de quantidades.

import { criar } from "./dom.js";
import { descreverVariavel, dividirDescricao, formatarCampo, formatarNumero } from "./formato.js";
import { criarBarras, criarCartao, criarTabela } from "./graficos.js";
import { ehIndicadorBinario } from "./secoes.js";

/** @typedef {Record<string, number|string>} LinhaCenso */

/**
 * Agrupa campos pelo trecho da descrição antes do primeiro " - ", preservando a ordem.
 * @example agruparPorDescricao(["IN_AGUA_POTAVEL"], dicionario) // Map {"Abastecimento de água" => [...]}
 * @param {string[]} campos
 * @param {import("./formato.js").Dicionario} dicionario
 * @returns {Map<string, Array<{campo: string, item: string}>>}
 */
export function agruparPorDescricao(campos, dicionario) {
  const grupos = new Map();
  for (const campo of campos) {
    const { grupo, item } = dividirDescricao(descreverVariavel(dicionario, campo));
    if (!grupos.has(grupo)) grupos.set(grupo, []);
    grupos.get(grupo).push({ campo, item });
  }
  return grupos;
}

function criarItemSimNao(item, valor) {
  const possui = valor === 1;
  return criar(
    "li",
    { "data-valor": possui ? "sim" : "nao" },
    criar("span", { class: possui ? "marca-sim" : "marca-nao", "aria-hidden": "true" }, possui ? "✓" : "–"),
    criar("span", {}, item, criar("span", { class: "sr-only" }, possui ? " (sim)" : " (não)")),
  );
}

function criarListaSimNao(campos, linha, dicionario) {
  const blocos = [];
  for (const [grupo, itens] of agruparPorDescricao(campos, dicionario)) {
    const ordenados = [...itens].sort((a, b) => Number(linha[b.campo]) - Number(linha[a.campo]));
    blocos.push(criar("div", { class: "subgrupo" }, grupo ? criar("h4", {}, grupo) : null, criar("ul", { class: "lista-sim-nao" }, ...ordenados.map((i) => criarItemSimNao(i.item, linha[i.campo])))));
  }
  return blocos;
}

function criarCamposDescritos(campos, linha, dicionario) {
  const pares = campos.map((campo) => criar("div", {}, criar("dt", {}, descreverVariavel(dicionario, campo)), criar("dd", {}, formatarCampo(dicionario, campo, linha[campo]))));
  return criar("dl", { class: "campos" }, ...pares);
}

/**
 * Cria o bloco de uma seção da escola: campos descritos primeiro, depois indicadores Sim/Não.
 * @example criarBlocoSecao("Dependências", ["IN_BIBLIOTECA"], escola, dicionario)
 * @param {string} titulo
 * @param {string[]} campos
 * @param {LinhaCenso} linha
 * @param {import("./formato.js").Dicionario} dicionario
 * @returns {HTMLElement|null}
 */
export function criarBlocoSecao(titulo, campos, linha, dicionario) {
  if (campos.length === 0) return null;
  const binarios = campos.filter((campo) => ehIndicadorBinario(campo, linha[campo]));
  const outros = campos.filter((campo) => !binarios.includes(campo));
  return criar(
    "section",
    { class: "cartao" },
    criar("h3", {}, titulo),
    outros.length ? criarCamposDescritos(outros, linha, dicionario) : null,
    outros.length && binarios.length ? criar("div", { style: "height:16px" }) : null,
    ...criarListaSimNao(binarios, linha, dicionario),
  );
}

/**
 * Tabela com todas as quantidades não nulas de uma tabela do Censo, recolhida por padrão.
 * @example criarDetalhamento("Todas as variáveis de matrícula", ficha.matricula, dicionario)
 * @param {string} titulo
 * @param {LinhaCenso} linha
 * @param {import("./formato.js").Dicionario} dicionario
 * @returns {HTMLElement}
 */
export function criarDetalhamento(titulo, linha, dicionario) {
  const linhas = Object.entries(linha).map(([campo, valor]) => [descreverVariavel(dicionario, campo), criar("code", {}, campo), formatarCampo(dicionario, campo, valor)]);
  const tabela = criarTabela([{ rotulo: "Descrição" }, { rotulo: "Variável" }, { rotulo: "Valor", numero: true }], linhas);
  return criar("details", { class: "cartao" }, criar("summary", {}, `${titulo} (${linhas.length})`), tabela);
}

/**
 * Cartões de barras dos grupos de indicadores de uma tabela (ex.: "matricula").
 * @example criarGruposDaFicha(indicadores, "matricula", ficha.matricula)
 * @param {import("./painel.js").Indicadores} indicadores
 * @param {string} tabela
 * @param {LinhaCenso} linha
 * @returns {HTMLElement[]}
 */
export function criarGruposDaFicha(indicadores, tabela, linha) {
  return indicadores.grupos
    .filter((grupo) => grupo.tabela === tabela)
    .map((grupo) => ({ grupo, itens: grupo.itens.map(([rotulo, coluna]) => ({ rotulo, valor: Number(linha[coluna] ?? 0) })) }))
    .filter(({ itens }) => itens.some((item) => item.valor > 0))
    .map(({ grupo, itens }) => criarCartao(grupo.titulo, criarBarras({ itens }), grupo.nota || undefined));
}

/**
 * Tabela de cursos técnicos da escola.
 * @example criarCursosDaEscola(ficha.cursos_tecnicos)
 * @param {LinhaCenso[]} cursos
 * @returns {HTMLElement}
 */
export function criarCursosDaEscola(cursos) {
  const linhas = cursos.map((curso) => [String(curso.NO_CURSO_EDUC_PROFISSIONAL ?? ""), String(curso.NO_AREA_CURSO_PROFISSIONAL ?? ""), formatarNumero(Number(curso.QT_MAT_CURSO_TEC ?? 0))]);
  return criarCartao("Cursos técnicos", criarTabela([{ rotulo: "Curso" }, { rotulo: "Eixo/área" }, { rotulo: "Matrículas", numero: true }], linhas));
}
