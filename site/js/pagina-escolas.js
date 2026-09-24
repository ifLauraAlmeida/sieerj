// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Página de busca de escolas com filtros sincronizados com a URL.

import { filtrarEscolas, filtrosDaUrl, filtrosParaUrl, linhasParaEscolas } from "./busca.js";
import { carregarJson } from "./dados.js";
import { criar, mostrarErro, substituir } from "./dom.js";
import { formatarNumero } from "./formato.js";
import { montarLayout } from "./layout.js";
import { criarListaPaginada } from "./lista-escolas.js";

const ESPERA_DIGITACAO_MS = 200;

/**
 * Preenche um <select> com opções [valor, rótulo], mantendo a opção "Todos".
 * @example preencherSelect(select, [["1", "Urbana"]], "1")
 * @param {HTMLSelectElement} select
 * @param {Array<[string, string]>} opcoes
 * @param {string} selecionado
 * @returns {void}
 */
export function preencherSelect(select, opcoes, selecionado) {
  for (const [valor, rotulo] of opcoes) select.append(criar("option", { value: valor }, rotulo));
  select.value = selecionado;
}

function opcoesDicionario(dicionario, variavel) {
  return Object.entries(dicionario[variavel]?.categorias ?? {});
}

function preencherFiltros(formulario, filtros, { dicionario, indicadores, indice }) {
  const campo = (nome) => /** @type {HTMLSelectElement} */ (formulario.elements.namedItem(nome));
  const municipios = Object.entries(indice.municipios).sort((a, b) => String(a[1]).localeCompare(String(b[1]), "pt-BR"));
  preencherSelect(campo("municipio"), municipios, filtros.municipio);
  preencherSelect(campo("dependencia"), opcoesDicionario(dicionario, "TP_DEPENDENCIA"), filtros.dependencia);
  preencherSelect(campo("localizacao"), opcoesDicionario(dicionario, "TP_LOCALIZACAO"), filtros.localizacao);
  preencherSelect(campo("situacao"), opcoesDicionario(dicionario, "TP_SITUACAO_FUNCIONAMENTO"), filtros.situacao);
  preencherSelect(campo("etapa"), Object.entries(indicadores.etapas), filtros.etapa);
  campo("texto").value = filtros.texto;
}

function lerFormulario(formulario) {
  const parametros = new URLSearchParams();
  for (const [nome, valor] of new FormData(formulario)) parametros.set(nome, String(valor));
  return filtrosDaUrl(parametros);
}

function desenharResultados(alvo, escolas, pagina, contexto) {
  const aoMudar = (nova) => {
    desenharResultados(alvo, escolas, nova, contexto);
    alvo.scrollIntoView({ block: "start" });
  };
  const resumo = criar("p", { class: "resumo-busca", role: "status" }, `${formatarNumero(escolas.length)} escolas encontradas`);
  substituir(alvo, resumo, escolas.length ? criarListaPaginada(escolas, pagina, contexto, aoMudar) : criar("p", { class: "vazio" }, "Nenhuma escola atende aos filtros."));
}

function ligarFormulario(formulario, escolas, alvo, contexto) {
  let espera = 0;
  const atualizar = () => {
    const filtros = lerFormulario(formulario);
    const consulta = filtrosParaUrl(filtros);
    history.replaceState(null, "", consulta ? `?${consulta}` : window.location.pathname);
    desenharResultados(alvo, filtrarEscolas(escolas, filtros), 1, contexto);
  };
  formulario.addEventListener("input", () => { clearTimeout(espera); espera = window.setTimeout(atualizar, ESPERA_DIGITACAO_MS); });
  formulario.addEventListener("submit", (evento) => { evento.preventDefault(); atualizar(); });
  formulario.addEventListener("reset", () => window.setTimeout(atualizar, 0));
  atualizar();
}

async function iniciar() {
  montarLayout("escolas");
  const alvo = /** @type {HTMLElement} */ (document.getElementById("resultados"));
  const formulario = /** @type {HTMLFormElement} */ (document.getElementById("filtros"));
  try {
    const [dicionario, indicadores, indice, anos] = await Promise.all(["dicionario.json", "indicadores.json", "indice.json", "anos.json"].map((nome) => carregarJson(nome)));
    preencherFiltros(formulario, filtrosDaUrl(new URLSearchParams(window.location.search)), { dicionario, indicadores, indice });
    const contexto = { dicionario, municipios: indice.municipios, etapas: indicadores.etapas, maisRecente: anos.mais_recente };
    ligarFormulario(formulario, linhasParaEscolas(indice), alvo, contexto);
  } catch (erro) {
    mostrarErro(alvo, /** @type {Error} */ (erro));
  }
}

iniciar();
