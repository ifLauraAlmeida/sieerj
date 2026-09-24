// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Cabeçalho e rodapé comuns a todas as páginas.

import { criar, substituir } from "./dom.js";
import { criarBotaoTema } from "./tema.js";

const URL_REPOSITORIO = "https://github.com/ifLauraAlmeida/sieerj";

const LINKS_NAVEGACAO = [
  { id: "inicio", href: "index.html", rotulo: "Panorama" },
  { id: "escolas", href: "escolas.html", rotulo: "Buscar escolas" },
  { id: "municipios", href: "index.html#municipios", rotulo: "Municípios" },
  { id: "comparar", href: "comparar.html", rotulo: "Comparar" },
  { id: "sobre", href: "index.html#sobre", rotulo: "Sobre os dados" },
];

function criarCabecalho(paginaAtual) {
  const links = LINKS_NAVEGACAO.map((link) =>
    criar("a", { href: link.href, "aria-current": link.id === paginaAtual ? "page" : undefined }, link.rotulo),
  );
  return criar(
    "div",
    { class: "container" },
    criar("a", { class: "marca", href: "index.html" }, criar("strong", {}, "SIEERJ"), criar("span", {}, "Estabelecimentos de Ensino do Rio de Janeiro")),
    criar("nav", { class: "navegacao", "aria-label": "Navegação principal" }, ...links),
    criarBotaoTema(window),
  );
}

function criarRodape() {
  return criar(
    "div",
    { class: "container" },
    criar("p", {}, "Fonte: INEP — Microdados do Censo Escolar da Educação Básica (2007 em diante). Recorte: Estado do Rio de Janeiro."),
    criar("p", {}, "O SIEERJ é um projeto independente, sem vínculo oficial com o INEP, o MEC ou o Governo do Estado do Rio de Janeiro."),
    criar("p", {}, "© 2026 Laura Almeida · ", criar("a", { href: URL_REPOSITORIO }, "Código-fonte e licença no GitHub")),
  );
}

/**
 * Preenche #cabecalho e #rodape, marcando o link da página atual.
 * @example montarLayout("escolas")
 * @param {string} paginaAtual
 * @returns {void}
 */
export function montarLayout(paginaAtual) {
  const cabecalho = document.getElementById("cabecalho");
  const rodape = document.getElementById("rodape");
  if (cabecalho) substituir(cabecalho, criarCabecalho(paginaAtual));
  if (rodape) substituir(rodape, criarRodape());
}

/**
 * Lê um parâmetro da URL atual.
 * @example parametroUrl("codigo") // "33036594"
 * @param {string} nome
 * @returns {string}
 */
export function parametroUrl(nome) {
  return new URLSearchParams(window.location.search).get(nome) ?? "";
}
