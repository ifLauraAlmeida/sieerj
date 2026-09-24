// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Ficha do estabelecimento: cabeçalho, comparações e abas temáticas (modelo CNES).

import { carregarBase, carregarEscola, carregarPanorama } from "./dados.js";
import { criarHistoricoEscola } from "./ficha-historico.js";
import { criar, mostrarErro, substituir } from "./dom.js";
import { descreverVariavel, formatarCampo, formatarDecimal, formatarNumero, normalizarTexto, rotuloCategoria } from "./formato.js";
import { criarBlocoSecao, criarCursosDaEscola, criarDetalhamento, criarGruposDaFicha } from "./ficha-secoes.js";
import { ativarDicas, criarBarras, criarCartao, criarIndicadores, criarTabela } from "./graficos.js";
import { montarLayout, parametroUrl } from "./layout.js";
import { calcularRazao } from "./painel.js";
import { SECAO_OUTROS, SECOES_ESCOLA, classificarCampos, etapasDaEscola, filtrarColetados } from "./secoes.js";

/**
 * @typedef {Record<string, number|string>} LinhaCenso
 * @typedef {{escola: LinhaCenso, matricula: LinhaCenso, turma: LinhaCenso, docente: LinhaCenso, gestor: LinhaCenso,
 *   cursos_tecnicos: LinhaCenso[]}} Ficha
 * @typedef {import("./dados.js").DadosBase & {panorama: import("./painel.js").Panorama, publicada: import("./dados.js").EscolaPublicada,
 *   campos: Map<string, string[]>, etapas: string[]}} ContextoFicha
 */

const TITULOS_SECOES = new Map([...SECOES_ESCOLA, SECAO_OUTROS].map((secao) => [secao.id, secao.titulo]));
const NOMES_TABELAS = { escola: "Escola", matricula: "Matrícula", turma: "Turma", docente: "Docente", gestor: "Gestor" };

function blocosSecoes(ids, ficha, contexto) {
  return ids.map((id) => criarBlocoSecao(TITULOS_SECOES.get(id) ?? id, contexto.campos.get(id) ?? [], ficha.escola, contexto.dicionario));
}

function criarComparacao(titulo, escola, municipio, estado, nomeMunicipio) {
  const itens = [
    { rotulo: "Esta escola", valor: escola },
    { rotulo: nomeMunicipio, valor: municipio },
    { rotulo: "Estado do RJ", valor: estado },
  ];
  return criarCartao(titulo, criarBarras({ itens, formatar: formatarDecimal }));
}

function razoesDe(totais) {
  return { turma: calcularRazao(totais.matriculas, totais.turmas), docente: calcularRazao(totais.matriculas, totais.docentes) };
}

function criarInfraEssencial(ficha, indicadores) {
  const itens = indicadores.infraestrutura.map((indicador) => {
    // Campo ausente = não respondido (escola sem atividade) ou não coletado no ano, não "não possui".
    const informado = indicador.coluna in ficha.escola;
    const possui = ficha.escola[indicador.coluna] === indicador.valor;
    const sufixo = !informado ? " (sem informação)" : possui ? "" : " (não)";
    return criar("li", { "data-valor": possui ? "sim" : "nao" }, criar("span", { class: possui ? "marca-sim" : "marca-nao", "aria-hidden": "true" }, possui ? "✓" : "–"), `${indicador.rotulo}${sufixo}`);
  });
  return criarCartao("Infraestrutura essencial", criar("ul", { class: "lista-sim-nao" }, ...itens));
}

function abaVisaoGeral(ficha, { indicadores, panorama }) {
  const totais = { matriculas: Number(ficha.matricula.QT_MAT_BAS ?? 0), turmas: Number(ficha.turma.QT_TUR_BAS ?? 0), docentes: Number(ficha.docente.QT_DOC_BAS ?? 0) };
  const municipio = panorama.municipios[String(ficha.escola.CO_MUNICIPIO)];
  const [daEscola, doMunicipio, doEstado] = [totais, municipio.totais, panorama.estado.totais].map(razoesDe);
  return [
    criarIndicadores([
      { rotulo: "Matrículas", valor: formatarNumero(totais.matriculas) },
      { rotulo: "Turmas", valor: formatarNumero(totais.turmas) },
      { rotulo: "Docentes", valor: formatarNumero(totais.docentes) },
      { rotulo: "Gestores", valor: formatarNumero(Number(ficha.gestor.QT_GEST_BAS ?? 0)) },
    ]),
    criar(
      "div",
      { class: "grade" },
      // Sem matrículas (escola extinta ou paralisada) a razão seria um "0" enganoso.
      totais.matriculas ? criarComparacao("Alunos por turma", daEscola.turma, doMunicipio.turma, doEstado.turma, municipio.nome) : null,
      totais.matriculas ? criarComparacao("Matrículas por docente", daEscola.docente, doMunicipio.docente, doEstado.docente, municipio.nome) : null,
      criarInfraEssencial(ficha, indicadores),
    ),
  ];
}

function abaQuantidades(tabelas, secoes) {
  return (ficha, contexto) => {
    const graficos = tabelas.flatMap((tabela) => criarGruposDaFicha(contexto.indicadores, tabela, ficha[tabela]));
    const detalhes = tabelas.filter((tabela) => Object.keys(ficha[tabela]).length).map((tabela) => criarDetalhamento(`Todas as variáveis de ${NOMES_TABELAS[tabela].toLowerCase()}`, ficha[tabela], contexto.dicionario));
    const vazio = graficos.length || detalhes.length ? null : criar("p", { class: "vazio" }, "Sem registros para esta escola no Censo.");
    return [vazio, graficos.length ? criar("div", { class: "grade" }, ...graficos) : null, ...blocosSecoes(secoes, ficha, contexto), ...detalhes];
  };
}

function linhasTodosDados(ficha, dicionario) {
  const tabelas = Object.keys(NOMES_TABELAS).flatMap((tabela) => Object.entries(ficha[tabela]).map(([campo, valor]) => ({ tabela, campo, valor })));
  return tabelas.map(({ tabela, campo, valor }) => {
    const descricao = descreverVariavel(dicionario, campo);
    return { busca: normalizarTexto(`${descricao} ${campo}`), celulas: [NOMES_TABELAS[tabela], descricao, criar("code", {}, campo), formatarCampo(dicionario, campo, valor)] };
  });
}

function abaTodosDados(ficha, { dicionario }) {
  const linhas = linhasTodosDados(ficha, dicionario);
  const colunas = [{ rotulo: "Tabela" }, { rotulo: "Descrição" }, { rotulo: "Variável" }, { rotulo: "Valor", numero: true }];
  const alvo = criar("div", {}, criarTabela(colunas, linhas.map((linha) => linha.celulas)));
  const filtro = criar("input", { type: "search", placeholder: "Filtrar por descrição ou variável", "aria-label": "Filtrar variáveis" });
  filtro.addEventListener("input", () => {
    const termo = normalizarTexto(/** @type {HTMLInputElement} */ (filtro).value);
    substituir(alvo, criarTabela(colunas, linhas.filter((linha) => linha.busca.includes(termo)).map((linha) => linha.celulas)));
  });
  const nota = criar("p", { class: "nota" }, "Quantidades zeradas e campos vazios são omitidos. Descrições conforme o dicionário de dados do INEP.");
  return [criar("div", { class: "cartao" }, criar("div", { style: "max-width:420px;margin-bottom:12px" }, filtro), nota, alvo)];
}

const ABAS = [
  { id: "geral", titulo: "Visão geral", montar: abaVisaoGeral },
  { id: "identificacao", titulo: "Identificação", montar: (f, c) => blocosSecoes(["identificacao", "vinculos"], f, c) },
  { id: "oferta", titulo: "Oferta", montar: (f, c) => [...blocosSecoes(["oferta"], f, c), f.cursos_tecnicos.length ? criarCursosDaEscola(f.cursos_tecnicos) : null] },
  { id: "infraestrutura", titulo: "Infraestrutura", montar: (f, c) => blocosSecoes(["predio", "saneamento", "dependencias", "acessibilidade"], f, c) },
  { id: "equipamentos", titulo: "Equipamentos", montar: (f, c) => blocosSecoes(["tecnologia", "materiais"], f, c) },
  { id: "matriculas", titulo: "Matrículas", montar: abaQuantidades(["matricula"], []) },
  { id: "turmas", titulo: "Turmas", montar: abaQuantidades(["turma"], []) },
  { id: "profissionais", titulo: "Docentes e profissionais", montar: abaQuantidades(["docente", "gestor"], ["profissionais"]) },
  { id: "gestao", titulo: "Gestão", montar: (f, c) => blocosSecoes(["gestao", SECAO_OUTROS.id], f, c) },
  { id: "historico", titulo: "Histórico", montar: (f, c) => criarHistoricoEscola(c.publicada.serie, String(f.escola.NO_ENTIDADE), c) },
  { id: "dados", titulo: "Todos os dados", montar: abaTodosDados },
];

function selecionarAba(botoes, paineis, id, focar = false) {
  botoes.forEach((botao) => {
    const ativo = botao.dataset.aba === id;
    botao.setAttribute("aria-selected", String(ativo));
    botao.tabIndex = ativo ? 0 : -1;
    if (ativo && focar) botao.focus();
  });
  paineis.forEach((painel) => { painel.hidden = painel.dataset.aba !== id; });
  history.replaceState(null, "", `${window.location.search}#${id}`);
}

function navegarPorTeclado(evento, botoes, paineis) {
  const posicao = botoes.findIndex((botao) => botao === document.activeElement);
  const passos = { ArrowRight: 1, ArrowLeft: -1 };
  if (posicao < 0 || !(evento.key in passos)) return;
  const destino = botoes[(posicao + passos[evento.key] + botoes.length) % botoes.length];
  selecionarAba(botoes, paineis, destino.dataset.aba ?? "", true);
}

function criarAbas(ficha, contexto) {
  const botoes = ABAS.map((aba) => criar("button", { type: "button", role: "tab", class: "aba", id: `aba-${aba.id}`, "aria-controls": `painel-${aba.id}`, "data-aba": aba.id }, aba.titulo));
  const paineis = ABAS.map((aba) => criar("div", { role: "tabpanel", class: "painel-aba", id: `painel-${aba.id}`, "aria-labelledby": `aba-${aba.id}`, "data-aba": aba.id }, ...aba.montar(ficha, contexto)));
  const lista = criar("div", { class: "abas", role: "tablist", "aria-label": "Seções da ficha" }, ...botoes);
  botoes.forEach((botao) => botao.addEventListener("click", () => selecionarAba(botoes, paineis, botao.dataset.aba ?? "")));
  lista.addEventListener("keydown", (evento) => navegarPorTeclado(evento, botoes, paineis));
  const inicial = ABAS.some((aba) => `#${aba.id}` === window.location.hash) ? window.location.hash.slice(1) : ABAS[0].id;
  selecionarAba(botoes, paineis, inicial);
  return [lista, ...paineis];
}

function camposTopo(escola, dicionario) {
  const categoria = (variavel) => (escola[variavel] !== undefined ? rotuloCategoria(dicionario, variavel, escola[variavel]) : null);
  return [
    ["Código INEP", String(escola.CO_ENTIDADE)],
    ["Município", criar("a", { href: `municipio.html?codigo=${escola.CO_MUNICIPIO}` }, String(escola.NO_MUNICIPIO))],
    ["Distrito", escola.NO_DISTRITO ? String(escola.NO_DISTRITO) : null],
    ["Dependência", categoria("TP_DEPENDENCIA")],
    // Dependência 4 = Privada; em escolas públicas o INEP às vezes grava 0 nessa variável.
    ["Categoria (privada)", escola.TP_DEPENDENCIA === 4 ? categoria("TP_CATEGORIA_ESCOLA_PRIVADA") : null],
    ["Localização", categoria("TP_LOCALIZACAO")],
    ["Localização diferenciada", escola.TP_LOCALIZACAO_DIFERENCIADA ? categoria("TP_LOCALIZACAO_DIFERENCIADA") : null],
    ["Situação", categoria("TP_SITUACAO_FUNCIONAMENTO")],
  ].filter(([, valor]) => valor);
}

function criarAvisoAno(escola, publicada, anos) {
  const comparar = criar("a", { href: `comparar.html?tipo=escola&ids=${escola.CO_ENTIDADE}` }, "Comparar com outras escolas");
  const texto = publicada.ano < anos.mais_recente
    ? `Esta escola não aparece nos Censos depois de ${publicada.ano}; a ficha mostra os dados de ${publicada.ano}. `
    : `Dados do Censo Escolar ${publicada.ano}. `;
  return criar("p", { class: publicada.ano < anos.mais_recente ? "aviso-ano" : "nota" }, texto, comparar);
}

function criarTopo(ficha, { dicionario, indicadores, etapas: siglas, publicada, anos }) {
  const { escola } = ficha;
  const etapas = Object.entries(indicadores.etapas).filter(([sigla]) => siglas.includes(sigla));
  const pares = camposTopo(escola, dicionario).map(([rotulo, valor]) => criar("div", {}, criar("dt", {}, rotulo), criar("dd", {}, valor)));
  return [
    criar("nav", { class: "trilha", "aria-label": "Trilha" }, criar("a", { href: "index.html" }, "Rio de Janeiro"), " › ", criar("a", { href: `municipio.html?codigo=${escola.CO_MUNICIPIO}` }, String(escola.NO_MUNICIPIO)), " › Ficha da escola"),
    criar("div", { class: "ficha-topo" }, criar("h1", {}, String(escola.NO_ENTIDADE)), criar("ul", { class: "etiquetas" }, ...etapas.map(([, rotulo]) => criar("li", { class: "etiqueta" }, rotulo))), criar("dl", {}, ...pares), criarAvisoAno(escola, publicada, anos)),
  ];
}

async function iniciar() {
  montarLayout("escolas");
  const alvo = /** @type {HTMLElement} */ (document.getElementById("conteudo"));
  try {
    const base = await carregarBase();
    const publicada = await carregarEscola(parametroUrl("codigo"), base.anos.lotes_fichas);
    const tabelas = ["escola", "matricula", "turma", "docente", "gestor"];
    const ficha = { ...publicada.ficha, ...Object.fromEntries(tabelas.map((t) => [t, filtrarColetados(publicada.ficha[t], base.dicionario, publicada.ano)])) };
    const panorama = await carregarPanorama(publicada.ano);
    const contexto = { ...base, panorama, publicada, campos: classificarCampos(ficha.escola), etapas: etapasDaEscola(ficha.escola, base.indicadores) };
    document.title = `${ficha.escola.NO_ENTIDADE} — SIEERJ`;
    substituir(alvo, ...criarTopo(ficha, contexto), ...criarAbas(ficha, contexto));
    ativarDicas(document.body);
  } catch (erro) {
    mostrarErro(alvo, /** @type {Error} */ (erro));
  }
}

iniciar();
