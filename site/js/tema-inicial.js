// SIEERJ — © 2026 Laura Almeida. Todos os direitos reservados; veja LICENSE.md.
// Script clássico (não módulo) carregado no <head>: aplica o tema salvo antes da primeira
// pintura, evitando que a página pisque no tema errado. A lógica completa está em js/tema.js.
(function aplicarTemaSalvo() {
  try {
    var salvo = window.localStorage.getItem("sieerj-tema");
    if (salvo === "claro") document.documentElement.dataset.theme = "light";
    if (salvo === "escuro") document.documentElement.dataset.theme = "dark";
  } catch (erro) {
    // Armazenamento bloqueado: segue o tema do sistema operacional.
  }
})();
