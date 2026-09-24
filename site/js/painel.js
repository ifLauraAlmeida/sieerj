// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Renderização de um panorama agregado (estado ou município).

import { criar } from "./dom.js";
import { calcularPercentual, formatarCompacto, formatarDecimal, formatarNumero, rotuloCategoria } from "./formato.js";
import { criarBarras, criarCartao, criarIndicadores, criarTabela } from "./graficos.js";

/**
 * @typedef {{escolas: number, em_atividade: number, categorias: Record<string, Record<string, number>>,
 *   totais: Record<string, number>, grupos: Record<string, number[]>, infraestrutura: number[],
 *   etapas: Record<string, number>, cursos: Array<[string, string, number, number]>, nome: string}} Agregado
 * @typedef {{grupos: Array<{id: string, titulo: string, tabela: string, itens: Array<[string, string]>, nota: string}>,
 *   infraestrutura: Array<{rotulo: string, coluna: string, valor: number}>, etapas: Record<string, string>,
 *   colunas_etapas: Record<string, string[]>, metricas_serie: import("./serie.js").MetricaSerie[]}} Indicadores
 * @typedef {{dicionario: import("./formato.js").Dicionario, indicadores: Indicadores, referencia?: Agregado}} ContextoPainel
 * @typedef {{ano: number, estado: Agregado, municipios: Record<string, Agregado>}} Panorama
 */

/**
 * Razão protegida contra divisão por zero.
 * @example calcularRazao(300, 12) // 25
 * @param {number} numerador
 * @param {number} denominador
 * @returns {number}
 */
export function calcularRazao(numerador, denominador) {
  return denominador > 0 ? numerador / denominador : 0;
}

/**
 * Converte uma contagem por código em itens de barra rotulados pelo dicionário, do maior para o menor.
 * @example itensDeCategoria({"1": 10, "2": 3}, "TP_LOCALIZACAO", dicionario) // [{rotulo: "Urbana", valor: 10}, ...]
 * @param {Record<string, number>} contagem
 * @param {string} variavel
 * @param {import("./formato.js").Dicionario} dicionario
 * @returns {Array<{rotulo: string, valor: number}>}
 */
export function itensDeCategoria(contagem, variavel, dicionario) {
  return Object.entries(contagem)
    .map(([codigo, valor]) => ({ rotulo: rotuloCategoria(dicionario, variavel, codigo), valor }))
    .sort((a, b) => b.valor - a.valor);
}

/**
 * Percentual de escolas em atividade que atendem cada indicador de infraestrutura.
 * @example percentuaisInfraestrutura({infraestrutura: [5], em_atividade: 10}) // [50]
 * @param {Agregado} agregado
 * @returns {number[]}
 */
export function percentuaisInfraestrutura(agregado) {
  return agregado.infraestrutura.map((quantidade) => calcularPercentual(quantidade, agregado.em_atividade));
}

function criarResumo(agregado) {
  const { totais } = agregado;
  return criarIndicadores([
    { rotulo: "Escolas em atividade", valor: formatarNumero(agregado.em_atividade), detalhe: `${formatarNumero(agregado.escolas)} cadastradas no Censo`, principal: true },
    { rotulo: "Matrículas", valor: formatarCompacto(totais.matriculas), detalhe: formatarNumero(totais.matriculas) },
    { rotulo: "Turmas", valor: formatarCompacto(totais.turmas), detalhe: `${formatarDecimal(calcularRazao(totais.matriculas, totais.turmas))} alunos por turma` },
    { rotulo: "Docentes", valor: formatarCompacto(totais.docentes), detalhe: `${formatarDecimal(calcularRazao(totais.matriculas, totais.docentes))} matrículas por docente` },
    { rotulo: "Gestores", valor: formatarCompacto(totais.gestores), detalhe: "diretores e outros gestores" },
  ]);
}

function criarCartaoCategoria(agregado, variavel, titulo, dicionario, nota) {
  const contagem = agregado.categorias[variavel] ?? {};
  if (Object.keys(contagem).length === 0) return null;
  return criarCartao(titulo, criarBarras({ itens: itensDeCategoria(contagem, variavel, dicionario) }), nota);
}

function criarCartaoEtapas(agregado, indicadores) {
  const itens = Object.entries(indicadores.etapas).map(([sigla, rotulo]) => ({ rotulo, valor: agregado.etapas[sigla] ?? 0 }));
  return criarCartao("Escolas por etapa oferecida", criarBarras({ itens }), "Uma escola pode oferecer várias etapas.");
}

function criarSecaoRede(agregado, { dicionario, indicadores }) {
  return criar(
    "div",
    { class: "grade" },
    criarCartaoCategoria(agregado, "TP_DEPENDENCIA", "Dependência administrativa", dicionario, "Escolas em atividade."),
    criarCartaoCategoria(agregado, "TP_LOCALIZACAO", "Localização", dicionario, "Escolas em atividade."),
    criarCartaoEtapas(agregado, indicadores),
    criarCartaoCategoria(agregado, "TP_SITUACAO_FUNCIONAMENTO", "Situação de funcionamento", dicionario, "Todas as escolas cadastradas no Censo."),
    criarCartaoCategoria(agregado, "TP_CATEGORIA_ESCOLA_PRIVADA", "Categoria da escola privada", dicionario),
    criarCartaoCategoria(agregado, "TP_LOCALIZACAO_DIFERENCIADA", "Localização diferenciada", dicionario),
  );
}

/**
 * Barras de infraestrutura em %, com marcador do agregado de referência (ex.: média estadual).
 * @example criarInfraestrutura(municipio, {dicionario, indicadores, referencia: estado})
 * @param {Agregado} agregado
 * @param {ContextoPainel} contexto
 * @returns {HTMLElement}
 */
export function criarInfraestrutura(agregado, { indicadores, referencia }) {
  const atuais = percentuaisInfraestrutura(agregado);
  const base = referencia ? percentuaisInfraestrutura(referencia) : [];
  const itens = indicadores.infraestrutura.map((indicador, posicao) => ({
    rotulo: indicador.rotulo,
    valor: atuais[posicao],
    referencia: referencia ? base[posicao] : undefined,
    dica: `${indicador.rotulo}: ${formatarDecimal(atuais[posicao])}%${referencia ? ` (estado: ${formatarDecimal(base[posicao])}%)` : ""}`,
  }));
  const barras = criarBarras({ itens, maximo: 100, formatar: (valor) => `${formatarDecimal(valor)}%`, rotuloReferencia: referencia ? "Percentual no estado" : undefined });
  return criarCartao(`% das ${formatarNumero(agregado.em_atividade)} escolas em atividade`, barras);
}

function criarCartaoGrupo(grupo, agregado) {
  const somas = agregado.grupos[grupo.id] ?? [];
  const itens = grupo.itens.map(([rotulo], posicao) => ({ rotulo, valor: somas[posicao] ?? 0 }));
  return criarCartao(grupo.titulo, criarBarras({ itens }), grupo.nota || undefined);
}

function criarGrupos(agregado, indicadores, tabelas) {
  const grupos = indicadores.grupos.filter((grupo) => tabelas.includes(grupo.tabela));
  return criar("div", { class: "grade" }, ...grupos.map((grupo) => criarCartaoGrupo(grupo, agregado)));
}

function criarCursos(agregado) {
  if (!agregado.cursos?.length) return criar("p", { class: "vazio" }, "Nenhum curso técnico registrado.");
  const linhas = agregado.cursos.map(([curso, area, escolas, matriculas]) => [curso, area, formatarNumero(escolas), formatarNumero(matriculas)]);
  const colunas = [{ rotulo: "Curso" }, { rotulo: "Eixo/área" }, { rotulo: "Escolas", numero: true }, { rotulo: "Matrículas", numero: true }];
  return criar("div", { class: "cartao" }, criarTabela(colunas, linhas));
}

/**
 * Monta o panorama completo de um agregado.
 * @example main.append(criarPanorama(panorama.estado, {dicionario, indicadores}))
 * @param {Agregado} agregado
 * @param {ContextoPainel} contexto
 * @returns {DocumentFragment}
 */
export function criarPanorama(agregado, contexto) {
  const fragmento = document.createDocumentFragment();
  fragmento.append(
    criarResumo(agregado),
    criar("p", { class: "nota" }, "Docentes e gestores são contados em cada escola em que atuam: quem trabalha em duas escolas aparece duas vezes."),
    criar("h2", { id: "rede" }, "Rede escolar"), criarSecaoRede(agregado, contexto),
    criar("h2", { id: "infraestrutura" }, "Infraestrutura"), criarInfraestrutura(agregado, contexto),
    criar("h2", { id: "matriculas" }, "Matrículas"), criarGrupos(agregado, contexto.indicadores, ["matricula"]),
    criar("h2", { id: "profissionais" }, "Turmas, docentes e gestores"), criarGrupos(agregado, contexto.indicadores, ["turma", "docente", "gestor"]),
    criar("h2", { id: "cursos" }, "Cursos técnicos com mais matrículas"), criarCursos(agregado),
  );
  return fragmento;
}
