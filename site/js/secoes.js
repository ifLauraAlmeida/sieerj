// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Organização dos campos da Tabela de Escola em seções temáticas da ficha (modelo CNES).

/** @typedef {{id: string, titulo: string, prefixos: string[]}} SecaoEscola */

/** @type {SecaoEscola[]} */
export const SECOES_ESCOLA = [
  {
    id: "identificacao",
    titulo: "Identificação",
    prefixos: [
      "NO_ENTIDADE", "CO_ENTIDADE", "NO_MUNICIPIO", "CO_MUNICIPIO", "NO_DISTRITO", "CO_DISTRITO",
      "NO_SUBDISTRITO", "NO_REGIAO_GEOG", "CO_REGIAO_GEOG", "CO_REDE", "TP_DEPENDENCIA", "TP_CATEGORIA_ESCOLA_PRIVADA",
      "TP_LOCALIZACAO", "TP_SITUACAO_FUNCIONAMENTO", "CO_ORGAO_REGIONAL", "DT_ANO_LETIVO", "NU_ANO_CENSO",
      "TP_REGULAMENTACAO", "TP_RESPONSAVEL_REGULAMENTACAO", "CO_ESCOLA_SEDE_VINCULADA", "CO_IES_OFERTANTE", "NU_CNPJ",
    ],
  },
  { id: "vinculos", titulo: "Vínculos, parcerias e mantenedora", prefixos: ["IN_VINCULO_", "IN_PODER_PUBLICO", "TP_PODER_PUBLICO", "IN_FORMA_CONT_", "IN_MANT_"] },
  {
    id: "oferta",
    titulo: "Oferta e atendimento",
    prefixos: [
      "TP_AEE", "TP_ATIVIDADE_COMPLEMENTAR", "IN_ESCOLARIZACAO", "IN_MEDIACAO_", "IN_REGULAR", "IN_EJA", "IN_PROFISSIONALIZANTE",
      "IN_ESPECIAL_EXCLUSIVA", "IN_COMUM_", "IN_ESP_EXCLUSIVA_", "TP_ITINERARIO", "IN_ITINERARIO", "IN_EDUCACAO_INDIGENA",
      "TP_INDIGENA", "CO_LINGUA", "IN_EXAME_SELECAO", "IN_RESERVA_",
    ],
  },
  { id: "predio", titulo: "Local de funcionamento", prefixos: ["IN_LOCAL_FUNC_", "TP_OCUPACAO_", "IN_PREDIO_"] },
  { id: "saneamento", titulo: "Água, energia, esgoto e lixo", prefixos: ["IN_AGUA_", "IN_ENERGIA_", "IN_ESGOTO_", "IN_LIXO_", "IN_TRATAMENTO_LIXO_"] },
  {
    id: "dependencias",
    titulo: "Dependências",
    prefixos: [
      "IN_ALMOXARIFADO", "IN_AREA_", "IN_AUDITORIO", "IN_BANHEIRO", "IN_BIBLIOTECA", "IN_COZINHA", "IN_DESPENSA",
      "IN_DORMITORIO", "IN_LABORATORIO", "IN_PATIO", "IN_PARQUE", "IN_PISCINA", "IN_QUADRA", "IN_REFEITORIO",
      "IN_SALA_", "IN_SECRETARIA", "IN_TERREIRAO", "IN_VIVEIRO", "IN_DEPENDENCIAS", "QT_SALAS_",
    ],
  },
  { id: "acessibilidade", titulo: "Acessibilidade", prefixos: ["IN_ACESSIBILIDADE_"] },
  {
    id: "tecnologia",
    titulo: "Equipamentos e tecnologia",
    prefixos: [
      "IN_EQUIP_", "QT_EQUIP_", "IN_COMPUTADOR", "IN_DESKTOP", "QT_DESKTOP", "IN_COMP_PORTATIL", "QT_COMP_PORTATIL",
      "IN_TABLET", "QT_TABLET", "IN_INTERNET", "IN_ACESSO_INTERNET", "IN_ACES_INTERNET", "TP_REDE_LOCAL", "IN_BANDA_LARGA",
    ],
  },
  { id: "profissionais", titulo: "Profissionais da escola", prefixos: ["QT_PROF_", "QT_FUNCIONARIOS", "IN_PROF_"] },
  { id: "materiais", titulo: "Materiais pedagógicos", prefixos: ["IN_MATERIAL_PED_"] },
  {
    id: "gestao",
    titulo: "Gestão e projeto pedagógico",
    prefixos: ["IN_ORGAO_", "TP_PROPOSTA", "IN_EDUC_AMB", "IN_REDES_SOCIAIS", "IN_ESPACO_", "IN_ALIMENTACAO"],
  },
];

export const SECAO_OUTROS = { id: "outros", titulo: "Outras informações", prefixos: [] };

/**
 * Encontra a seção de um campo pelo prefixo mais longo que casa, para evitar ambiguidades
 * como IN_EJA (oferta) versus IN_EDUC_AMB (gestão).
 * @example secaoDoCampo("IN_BIBLIOTECA") // "dependencias"
 * @param {string} campo
 * @returns {string}
 */
export function secaoDoCampo(campo) {
  let melhor = { id: SECAO_OUTROS.id, tamanho: 0 };
  for (const secao of SECOES_ESCOLA) {
    for (const prefixo of secao.prefixos) {
      if (campo.startsWith(prefixo) && prefixo.length > melhor.tamanho) melhor = { id: secao.id, tamanho: prefixo.length };
    }
  }
  return melhor.id;
}

/**
 * Distribui os campos da escola pelas seções, preservando a ordem original do Censo.
 * @example classificarCampos({NO_ENTIDADE: "X", IN_BIBLIOTECA: 1}).get("dependencias") // ["IN_BIBLIOTECA"]
 * @param {Record<string, number|string>} escola
 * @returns {Map<string, string[]>}
 */
export function classificarCampos(escola) {
  /** @type {Map<string, string[]>} */
  const campos = new Map([...SECOES_ESCOLA, SECAO_OUTROS].map((secao) => [secao.id, []]));
  for (const campo of Object.keys(escola)) campos.get(secaoDoCampo(campo))?.push(campo);
  return campos;
}

/**
 * Remove da linha as variáveis que o Censo não coletou no ano (o INEP as preenche com 0 nos anos republicados).
 * @example filtrarColetados({IN_A: 0, IN_B: 1}, {IN_A: {descricao: "", categorias: {}, anos_coleta: [2019]}}, 2018) // {IN_B: 1}
 * @param {Record<string, number|string>} linha
 * @param {Record<string, {anos_coleta?: number[]}>} dicionario
 * @param {number} ano
 * @returns {Record<string, number|string>}
 */
export function filtrarColetados(linha, dicionario, ano) {
  const coletada = (campo) => !dicionario[campo]?.anos_coleta?.length || dicionario[campo].anos_coleta.includes(ano);
  return Object.fromEntries(Object.entries(linha).filter(([campo]) => coletada(campo)));
}

/**
 * Lista as siglas das etapas oferecidas, pela mesma regra do pipeline (pipeline/ficha.py).
 * @example etapasDaEscola({IN_EJA: 1}, {colunas_etapas: {EJA: ["IN_EJA"]}}) // ["EJA"]
 * @param {Record<string, number|string>} escola
 * @param {{colunas_etapas: Record<string, string[]>}} indicadores
 * @returns {string[]}
 */
export function etapasDaEscola(escola, indicadores) {
  return Object.entries(indicadores.colunas_etapas)
    .filter(([, colunas]) => colunas.some((coluna) => escola[coluna] === 1))
    .map(([sigla]) => sigla);
}

/**
 * Indica se o campo é um indicador binário (0/1) do Censo.
 * @example ehIndicadorBinario("IN_INTERNET", 1) // true
 * @param {string} campo
 * @param {number|string} valor
 * @returns {boolean}
 */
export function ehIndicadorBinario(campo, valor) {
  return campo.startsWith("IN_") && (valor === 0 || valor === 1);
}
