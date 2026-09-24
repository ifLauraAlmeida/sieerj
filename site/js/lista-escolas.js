// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Lista de escolas (resultado de busca) com paginação.

import { paginar } from "./busca.js";
import { criar } from "./dom.js";
import { formatarNumero, rotuloCategoria } from "./formato.js";

/**
 * @typedef {{dicionario: import("./formato.js").Dicionario, municipios: Record<string, string>, etapas: Record<string, string>,
 *   maisRecente?: number}} ContextoLista
 */

// Situação 1 = "Em Atividade" no dicionário do INEP.
const SITUACAO_EM_ATIVIDADE = 1;

function criarEtiquetas(escola, contexto) {
  const etiquetas = escola.etapas.map((sigla) => criar("li", { class: "etiqueta" }, contexto.etapas[sigla] ?? sigla));
  if (escola.situacao !== SITUACAO_EM_ATIVIDADE) {
    const situacao = rotuloCategoria(contexto.dicionario, "TP_SITUACAO_FUNCIONAMENTO", escola.situacao);
    etiquetas.unshift(criar("li", { class: "etiqueta etiqueta-alerta" }, situacao));
  }
  if (contexto.maisRecente && escola.ano && escola.ano < contexto.maisRecente) {
    etiquetas.unshift(criar("li", { class: "etiqueta etiqueta-alerta" }, `Último Censo: ${escola.ano}`));
  }
  return criar("ul", { class: "etiquetas", "aria-label": "Etapas e situação" }, ...etiquetas);
}

/**
 * Cria o item de uma escola na lista de resultados.
 * @example lista.append(criarResultado(escola, contexto))
 * @param {import("./busca.js").EscolaIndice} escola
 * @param {ContextoLista} contexto
 * @returns {HTMLElement}
 */
export function criarResultado(escola, contexto) {
  const { dicionario } = contexto;
  const meta = [
    `INEP ${escola.codigo}`,
    contexto.municipios[String(escola.municipio)] ?? "",
    rotuloCategoria(dicionario, "TP_DEPENDENCIA", escola.dependencia),
    rotuloCategoria(dicionario, "TP_LOCALIZACAO", escola.localizacao),
  ].filter(Boolean).join(" · ");
  return criar(
    "li",
    { class: "resultado" },
    criar("div", {}, criar("a", { href: `escola.html?codigo=${escola.codigo}` }, escola.nome), criar("div", { class: "resultado-meta" }, meta), criarEtiquetas(escola, contexto)),
    criar("div", { class: "resultado-numeros" }, `${formatarNumero(escola.matriculas)} matrículas`, criar("br"), `${formatarNumero(escola.turmas)} turmas`),
  );
}

function criarPaginacao(pagina, totalPaginas, aoMudar) {
  const botao = (rotulo, desabilitado) =>
    criar("button", { type: "button", class: "botao botao-secundario", disabled: desabilitado }, rotulo);
  const anterior = botao("← Anterior", pagina <= 1);
  const proxima = botao("Próxima →", pagina >= totalPaginas);
  anterior.addEventListener("click", () => aoMudar(pagina - 1));
  proxima.addEventListener("click", () => aoMudar(pagina + 1));
  return criar("nav", { class: "paginacao", "aria-label": "Paginação" }, anterior, criar("span", { "aria-live": "polite" }, `Página ${pagina} de ${totalPaginas}`), proxima);
}

/**
 * Cria a lista paginada; `aoMudar` recebe o número da nova página.
 * @example criarListaPaginada(escolas, 1, contexto, (p) => render(p))
 * @param {import("./busca.js").EscolaIndice[]} escolas
 * @param {number} pagina
 * @param {ContextoLista} contexto
 * @param {(pagina: number) => void} aoMudar
 * @returns {HTMLElement}
 */
export function criarListaPaginada(escolas, pagina, contexto, aoMudar) {
  const recorte = paginar(escolas, pagina);
  const lista = criar("ul", { class: "resultados" }, ...recorte.itens.map((escola) => criarResultado(escola, contexto)));
  if (recorte.totalPaginas === 1) return lista;
  return criar("div", {}, lista, criarPaginacao(recorte.pagina, recorte.totalPaginas, aoMudar));
}
