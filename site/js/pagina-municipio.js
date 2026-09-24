// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Página de município: panorama por ano comparado ao estado, evolução histórica e maiores escolas.

import { linhasParaEscolas } from "./busca.js";
import { anoValido, carregarBase, carregarJson, carregarPanorama, carregarSeries } from "./dados.js";
import { criar, mostrarErro, substituir } from "./dom.js";
import { FIXAS_AGREGADO, criarEvolucao, opcoesAgregadas } from "./evolucao.js";
import { formatarNumero } from "./formato.js";
import { ativarDicas } from "./graficos.js";
import { montarLayout, parametroUrl } from "./layout.js";
import { criarListaPaginada } from "./lista-escolas.js";
import { criarPanorama } from "./painel.js";
import { criarSeletorAno } from "./seletor-ano.js";

const LIMITE_MAIORES_ESCOLAS = 10;
// Situação 1 = "Em Atividade"; o índice traz a situação do último Censo de cada escola.
const SITUACAO_EM_ATIVIDADE = 1;

function criarMaioresEscolas(codigo, indice, contexto) {
  const escolas = linhasParaEscolas(indice).filter((escola) => String(escola.municipio) === codigo);
  const ativas = escolas.filter((escola) => escola.situacao === SITUACAO_EM_ATIVIDADE).sort((a, b) => b.matriculas - a.matriculas);
  return criar(
    "div",
    {},
    criarListaPaginada(ativas.slice(0, LIMITE_MAIORES_ESCOLAS), 1, contexto, () => undefined),
    criar("p", {}, criar("a", { class: "botao", href: `escolas.html?municipio=${codigo}` }, `Ver todas as ${formatarNumero(escolas.length)} escolas já registradas`)),
  );
}

function criarCabecalho(codigo, nome, seletor) {
  return [
    criar("nav", { class: "trilha", "aria-label": "Trilha" }, criar("a", { href: "index.html" }, "Rio de Janeiro"), " › ", nome),
    criar("h1", {}, nome),
    criar("p", { class: "subtitulo" }, "Panorama municipal. As barras de infraestrutura mostram também o percentual do estado no mesmo ano. ", criar("a", { href: `comparar.html?tipo=municipio&ids=${codigo}` }, "Comparar com outros municípios")),
    seletor,
  ];
}

async function desenharAno(alvo, codigo, base, ano) {
  const panorama = await carregarPanorama(ano);
  const agregado = panorama.municipios[codigo];
  if (!agregado) return substituir(alvo, criar("p", { class: "vazio" }, `Sem escolas registradas neste município em ${ano}.`));
  substituir(alvo, criarPanorama(agregado, { dicionario: base.dicionario, indicadores: base.indicadores, referencia: panorama.estado }));
}

function criarEvolucaoMunicipio(codigo, series, indicadores) {
  const municipio = series.municipios[codigo];
  const contexto = {
    anos: series.anos, metricas: series.metricas, opcoes: opcoesAgregadas(indicadores), fixas: FIXAS_AGREGADO,
    principal: { nome: municipio.nome, linhas: municipio.valores }, referencia: { nome: "Estado do RJ", linhas: series.estado },
  };
  return criarEvolucao(contexto);
}

async function iniciar() {
  montarLayout("municipios");
  const alvo = /** @type {HTMLElement} */ (document.getElementById("conteudo"));
  try {
    const codigo = parametroUrl("codigo");
    const [base, series, indice] = await Promise.all([carregarBase(), carregarSeries(), carregarJson("indice.json")]);
    const municipio = series.municipios[codigo];
    if (!municipio) throw new Error(`Município "${codigo}" não encontrado (esperado código IBGE de 7 dígitos do RJ, ex.: 3304557)`);
    document.title = `${municipio.nome} — SIEERJ`;
    const painelAno = criar("div", {});
    const seletor = criarSeletorAno(base.anos, anoValido(parametroUrl("ano"), base.anos), (ano) => desenharAno(painelAno, codigo, base, ano));
    const contextoLista = { dicionario: base.dicionario, municipios: indice.municipios, etapas: base.indicadores.etapas };
    substituir(alvo, ...criarCabecalho(codigo, municipio.nome, seletor), painelAno,
      criar("h2", { id: "evolucao" }, "Evolução"), criarEvolucaoMunicipio(codigo, series, base.indicadores),
      criar("h2", {}, "Escolas em atividade com mais matrículas (último Censo)"), criarMaioresEscolas(codigo, indice, contextoLista));
    await desenharAno(painelAno, codigo, base, anoValido(parametroUrl("ano"), base.anos));
    ativarDicas(document.body);
  } catch (erro) {
    mostrarErro(alvo, /** @type {Error} */ (erro));
  }
}

iniciar();
