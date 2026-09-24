// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Página inicial: panorama estadual por ano, evolução histórica e tabela de municípios.

import { anoValido, carregarBase, carregarPanorama, carregarSeries } from "./dados.js";
import { criar, mostrarErro, substituir } from "./dom.js";
import { FIXAS_AGREGADO, criarEvolucao, opcoesAgregadas } from "./evolucao.js";
import { ativarDicas } from "./graficos.js";
import { montarLayout, parametroUrl } from "./layout.js";
import { criarPanorama } from "./painel.js";
import { criarSeletorAno } from "./seletor-ano.js";
import { montarTabelaMunicipios } from "./tabela-municipios.js";

function elemento(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}

async function desenharAno(base, ano) {
  const panorama = await carregarPanorama(ano);
  substituir(elemento("panorama"), criarPanorama(panorama.estado, { dicionario: base.dicionario, indicadores: base.indicadores }));
  montarTabelaMunicipios(elemento("tabela-municipios"), panorama.municipios, ano);
}

async function desenharEvolucao(base) {
  const series = await carregarSeries();
  const contexto = { anos: series.anos, metricas: series.metricas, principal: { nome: "Estado do RJ", linhas: series.estado }, opcoes: opcoesAgregadas(base.indicadores), fixas: FIXAS_AGREGADO };
  const periodo = `${series.anos[0]}–${series.anos[series.anos.length - 1]}`;
  substituir(elemento("evolucao-estado"), criar("p", { class: "subtitulo" }, `Censos de ${periodo}. Anos sem o dado coletado aparecem como lacuna na linha.`), criarEvolucao(contexto));
}

async function iniciar() {
  montarLayout("inicio");
  try {
    const base = await carregarBase();
    const ano = anoValido(parametroUrl("ano"), base.anos);
    substituir(elemento("seletor-ano"), criarSeletorAno(base.anos, ano, (novo) => desenharAno(base, novo).catch((erro) => mostrarErro(elemento("panorama"), erro))));
    await Promise.all([desenharAno(base, ano), desenharEvolucao(base)]);
    ativarDicas(document.body);
    // A âncora (#municipios, #sobre, #evolucao) só existe depois da renderização.
    if (window.location.hash) document.querySelector(window.location.hash)?.scrollIntoView();
  } catch (erro) {
    mostrarErro(elemento("panorama"), /** @type {Error} */ (erro));
  }
}

iniciar();
