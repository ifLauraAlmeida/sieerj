// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Página Comparar: evolução de até 4 escolas ou municípios num mesmo indicador.

import { linhasParaEscolas } from "./busca.js";
import { adicionarId, lerSelecao, selecaoParaUrl, sugerirEscolas, sugerirMunicipios, TIPOS } from "./comparacao.js";
import { carregarBase, carregarEscola, carregarJson, carregarSeries } from "./dados.js";
import { criar, mostrarErro, substituir } from "./dom.js";
import { formatadoresDoTipo, opcoesAgregadas, textoVariacao } from "./evolucao.js";
import { LARGURA_AMPLA, LARGURA_CARTAO, criarGraficoLinhas, MAXIMO_SERIES } from "./graficos-linha.js";

const LIMITE_TELA_ESTREITA = 720;
import { montarLayout } from "./layout.js";
import { alinharAnos, opcoesDeMetrica, valoresDaMetrica } from "./serie.js";

/** @typedef {{base: import("./dados.js").DadosBase, series: import("./serie.js").SeriesAgregadas, escolas: import("./busca.js").EscolaIndice[], municipios: Record<string, string>}} ContextoComparar */

function opcoesDoTipo(tipo, base) {
  // Para uma escola, infraestrutura é 0/1 por ano: fica na grade da ficha, não em linhas.
  if (tipo === "municipio") return opcoesAgregadas(base.indicadores);
  return opcoesDeMetrica(base.indicadores.metricas_serie, false).filter((opcao) => opcao.tipo !== "infraestrutura");
}

async function fonteDaEntidade(tipo, id, contexto) {
  if (tipo === "municipio") return { nome: contexto.series.municipios[id]?.nome ?? id, linhas: contexto.series.municipios[id]?.valores ?? [] };
  const escola = await carregarEscola(id, contexto.base.anos.lotes_fichas);
  return { nome: String(escola.ficha.escola.NO_ENTIDADE), linhas: alinharAnos(escola.serie.anos, escola.serie.valores, contexto.base.anos.anos) };
}

function metricasDoTipo(tipo, contexto) {
  return tipo === "municipio" ? contexto.series.metricas : contexto.base.indicadores.metricas_serie.map((metrica) => metrica.id);
}

function larguraDoGrafico() {
  // Em telas estreitas o gráfico amplo ficaria com texto ilegível ao ser reduzido.
  return window.innerWidth < LIMITE_TELA_ESTREITA ? LARGURA_CARTAO : LARGURA_AMPLA;
}

async function criarResultado(selecao, contexto) {
  if (!selecao.ids.length) return criar("p", { class: "vazio" }, `Adicione até ${MAXIMO_SERIES} ${TIPOS[selecao.tipo].toLowerCase()} para comparar.`);
  const opcao = opcoesDoTipo(selecao.tipo, contexto.base).find((item) => item.id === selecao.metrica) ?? opcoesDoTipo(selecao.tipo, contexto.base)[0];
  const fontes = await Promise.all(selecao.ids.map((id) => fonteDaEntidade(selecao.tipo, id, contexto)));
  const metricas = metricasDoTipo(selecao.tipo, contexto);
  const series = fontes.map((fonte) => ({ nome: fonte.nome, valores: valoresDaMetrica(fonte.linhas, metricas, opcao.id) }));
  const formatadores = formatadoresDoTipo(opcao.tipo);
  const anos = contexto.base.anos.anos;
  const variacoes = series.map((serie) => criar("li", {}, criar("strong", {}, serie.nome), ": ", textoVariacao(serie.valores, anos, formatadores.formatar) || "sem dados suficientes"));
  return criar("section", { class: "cartao" }, criar("h3", {}, opcao.rotulo), criarGraficoLinhas({ anos, series, ...formatadores, largura: larguraDoGrafico(), descricao: `${opcao.rotulo}: comparação por ano` }), criar("h4", {}, "Variação no período"), criar("ul", {}, ...variacoes));
}

function criarChips(selecao, contexto, aoMudar) {
  const nomeDe = (id) => (selecao.tipo === "municipio" ? contexto.municipios[id] : contexto.escolas.find((e) => String(e.codigo) === id)?.nome) ?? id;
  const chips = selecao.ids.map((id) => {
    const remover = criar("button", { type: "button", "aria-label": `Remover ${nomeDe(id)}` }, "×");
    remover.addEventListener("click", () => aoMudar({ ...selecao, ids: selecao.ids.filter((outro) => outro !== id) }));
    return criar("li", { class: "selecionado" }, nomeDe(id), remover);
  });
  return criar("ul", { class: "selecionados", "aria-label": "Selecionados" }, ...chips);
}

function criarSugestao(sugestao, aoEscolher) {
  const detalhe = sugestao.detalhe ? [criar("br"), criar("small", {}, sugestao.detalhe)] : [];
  const botao = criar("button", { type: "button" }, sugestao.nome, ...detalhe);
  botao.addEventListener("click", aoEscolher);
  return criar("li", {}, botao);
}

function criarBuscaEntidade(selecao, contexto, aoMudar) {
  const entrada = /** @type {HTMLInputElement} */ (criar("input", { type: "search", placeholder: selecao.tipo === "escola" ? "Nome ou código INEP (mín. 3 letras)" : "Nome do município", autocomplete: "off", disabled: selecao.ids.length >= MAXIMO_SERIES }));
  const lista = criar("ul", { class: "sugestoes", hidden: true });
  entrada.addEventListener("input", () => {
    const sugestoes = selecao.tipo === "escola" ? sugerirEscolas(contexto.escolas, contexto.municipios, entrada.value, selecao.ids) : sugerirMunicipios(contexto.municipios, entrada.value, selecao.ids);
    const botoes = sugestoes.map((sugestao) => criarSugestao(sugestao, () => aoMudar({ ...selecao, ids: adicionarId(selecao.ids, sugestao.id) })));
    substituir(lista, ...botoes);
    lista.hidden = botoes.length === 0;
  });
  return criar("label", {}, `Adicionar ${selecao.tipo === "escola" ? "escola" : "município"}`, entrada, lista);
}

function criarSelect(rotulo, opcoes, valor, aoEscolher) {
  const select = /** @type {HTMLSelectElement} */ (criar("select", {}, ...opcoes.map(([id, texto]) => criar("option", { value: id, selected: id === valor }, texto))));
  select.addEventListener("change", () => aoEscolher(select.value));
  return criar("label", {}, rotulo, select);
}

function criarControles(selecao, contexto, aoMudar) {
  const tipos = Object.entries(TIPOS);
  const metricas = opcoesDoTipo(selecao.tipo, contexto.base).map((opcao) => [opcao.id, opcao.rotulo]);
  return criar(
    "div",
    { class: "cartao" },
    criar("div", { class: "comparar-controles" },
      criarSelect("Comparar", tipos, selecao.tipo, (tipo) => aoMudar({ tipo, ids: [], metrica: "" })),
      criarBuscaEntidade(selecao, contexto, aoMudar),
      criarSelect("Indicador", metricas, selecao.metrica || metricas[0][0], (metrica) => aoMudar({ ...selecao, metrica }))),
    criarChips(selecao, contexto, aoMudar),
  );
}

async function desenhar(alvo, selecao, contexto) {
  history.replaceState(null, "", `?${selecaoParaUrl(selecao)}`);
  const aoMudar = (nova) => desenhar(alvo, nova, contexto).catch((erro) => mostrarErro(alvo, erro));
  const resultado = criar("div", {}, criar("p", { class: "carregando" }, "Carregando séries…"));
  substituir(alvo, criarControles(selecao, contexto, aoMudar), resultado);
  substituir(resultado, await criarResultado(selecao, contexto));
}

async function iniciar() {
  montarLayout("comparar");
  const alvo = /** @type {HTMLElement} */ (document.getElementById("comparacao"));
  try {
    const [base, series, indice] = await Promise.all([carregarBase(), carregarSeries(), carregarJson("indice.json")]);
    const municipios = Object.fromEntries(Object.entries(series.municipios).map(([id, m]) => [id, m.nome]));
    const contexto = { base, series, escolas: linhasParaEscolas(indice), municipios };
    await desenhar(alvo, lerSelecao(new URLSearchParams(window.location.search)), contexto);
  } catch (erro) {
    mostrarErro(alvo, /** @type {Error} */ (erro));
  }
}

iniciar();
