const entregaInput = document.getElementById("config-entrega");
const retiradaInput = document.getElementById("config-retirada");
const whatsappInput = document.getElementById("config-whatsapp");
const publicUrlInput = document.getElementById("config-public-url");
const temaCardapioInput = document.getElementById("config-tema-cardapio");
const temaAdminInput = document.getElementById("config-tema-admin");
const msgPixInput = document.getElementById("config-msg-pix");
const promoUnidadeInput = document.getElementById("config-promo-unidade");
const promoComboInput = document.getElementById("config-promo-combo");
const promoMinQtdInput = document.getElementById("config-promo-min-qtd");
const promoTagTextInput = document.getElementById("config-promo-tag-text");
const promoDestaqueTextInput = document.getElementById("config-promo-destaque-text");
const promoSubTextInput = document.getElementById("config-promo-sub-text");
const logoUrlInput = document.getElementById("config-logo-url");
const logoFileInput = document.getElementById("config-logo-file");
const funcDiasInputs = Array.from(document.querySelectorAll(".dia-func"));
const funcAbreInput = document.getElementById("config-func-abre");
const funcFechaInput = document.getElementById("config-func-fecha");
const printTokenInput = document.getElementById("config-print-token");
const printInterfaceInput = document.getElementById("config-print-interface");
const printWindowsModeInput = document.getElementById("config-print-windows-mode");
const printMaxColsInput = document.getElementById("config-print-max-cols");
const printScaleXInput = document.getElementById("config-print-scale-x");
const printScaleYInput = document.getElementById("config-print-scale-y");
const printBoldInput = document.getElementById("config-print-bold");
const printCommandInput = document.getElementById("config-print-command");
const expoStatus = document.getElementById("expo-status");
const expoUrlInput = document.getElementById("config-expo-url");
const expoQrImg = document.getElementById("expo-qr-img");
const expoQrPlaceholder = document.getElementById("expo-qr-placeholder");
const copyExpoUrlBtn = document.getElementById("config-copy-expo-url");
const refreshExpoBtn = document.getElementById("config-refresh-expo");
const botAutoReplyInput = document.getElementById("config-bot-auto-reply");
const autoAceitarInput = document.getElementById("config-auto-aceitar");
const autoImprimirInput = document.getElementById("config-auto-imprimir");
const copyPrintCmdBtn = document.getElementById("config-copy-print-cmd");

const temasDisponiveis = [
  { value: "original", name: "Original", detail: "Azul e laranja" },
  { value: "copa-brasil", name: "Copa Brasil", detail: "Verde, amarelo e azul" },
  { value: "chapa-fogo", name: "Chapa & Fogo", detail: "Escuro, vermelho e brasa" },
  { value: "diner-retro", name: "Diner Retro", detail: "Creme, vermelho e verde" },
  { value: "neon-noturno", name: "Neon Noturno", detail: "Roxo, ciano e magenta" },
  { value: "fliperama-90", name: "Fliperama 90", detail: "Arcade, pixels e energia" },
  { value: "rota-66", name: "Rota 66", detail: "Estrada, cromo e asfalto" },
  { value: "boteco-raiz", name: "Boteco Raiz", detail: "Azulejo, madeira e limao" },
  { value: "aranha-urbana", name: "Homem-Aranha", detail: "Heroi classico, teias, vermelho e azul" },
];

function atualizarCartoesTema(target, value) {
  document.querySelectorAll(`[data-theme-options="${target}"] .theme-option`).forEach((button) => {
    const active = button.dataset.themeValue === value;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function selecionarTema(target, value, { preview = true } = {}) {
  const normalized = temasDisponiveis.some((theme) => theme.value === value) ? value : "original";
  const input = target === "admin" ? temaAdminInput : temaCardapioInput;
  if (input) input.value = normalized;
  atualizarCartoesTema(target, normalized);
  if (target === "admin" && preview && typeof window.aplicarTemaVisualAdmin === "function") {
    window.aplicarTemaVisualAdmin(normalized, { persist: false });
  }
}

function iniciarCartoesTema() {
  document.querySelectorAll("[data-theme-options]").forEach((container) => {
    const target = container.dataset.themeOptions;
    container.innerHTML = temasDisponiveis.map((theme) => `
      <button class="theme-option" type="button" data-theme-value="${theme.value}" aria-pressed="false">
        <span class="theme-swatch ${theme.value}"></span>
        <span><strong>${theme.name}</strong><small>${theme.detail}</small></span>
      </button>
    `).join("");
    container.querySelectorAll(".theme-option").forEach((button) => {
      button.addEventListener("click", () => selecionarTema(target, button.dataset.themeValue));
    });
  });
  temaCardapioInput?.addEventListener("change", () => selecionarTema("cardapio", temaCardapioInput.value));
  temaAdminInput?.addEventListener("change", () => selecionarTema("admin", temaAdminInput.value));
}
const downloadPrintCmdBtn = document.getElementById("config-download-print-cmd");
const testPrintBtn = document.getElementById("config-test-print");
const clearPrintQueueBtn = document.getElementById("config-clear-print-queue");
const salvarBtn = document.getElementById("config-salvar");
const recarregarBtn = document.getElementById("config-recarregar");
const aviso = document.getElementById("aviso");
const wppStatus = document.getElementById("wpp-status");
const wppStartBtn = document.getElementById("wpp-start");
const wppRefreshBtn = document.getElementById("wpp-refresh");
const wppDisconnectBtn = document.getElementById("wpp-disconnect");
const wppQrImg = document.getElementById("wpp-qr-img");
const wppQrPlaceholder = document.getElementById("wpp-qr-placeholder");
const whatsappOutboxRefreshBtn = document.getElementById("whatsapp-outbox-refresh");
const whatsappOutboxCounts = document.getElementById("whatsapp-outbox-counts");
const whatsappOutboxList = document.getElementById("whatsapp-outbox-list");
const adminUsersRefreshBtn = document.getElementById("admin-users-refresh");
const adminUserCreateBtn = document.getElementById("admin-user-create");
const adminUserNameInput = document.getElementById("admin-user-name");
const adminUserEmailInput = document.getElementById("admin-user-email");
const adminUserPasswordInput = document.getElementById("admin-user-password");
const adminUserConfirmInput = document.getElementById("admin-user-confirm");
const adminUsersList = document.getElementById("admin-users-list");
const accountCurrentPasswordInput = document.getElementById("account-current-password");
const accountNewPasswordInput = document.getElementById("account-new-password");
const accountConfirmPasswordInput = document.getElementById("account-confirm-password");
const accountChangePasswordBtn = document.getElementById("account-change-password");
const adminEmailStatus = document.getElementById("admin-email-status");
const adminEmailTestBtn = document.getElementById("admin-email-test");
const adminAuditRefreshBtn = document.getElementById("admin-audit-refresh");
const adminAuditList = document.getElementById("admin-audit-list");
const parserAliasesRefreshBtn = document.getElementById("parser-aliases-refresh");
const parserAliasesList = document.getElementById("parser-aliases-list");
const customerAiStatusTitle = document.getElementById("customer-ai-status-title");
const customerAiStatusDetail = document.getElementById("customer-ai-status-detail");
const syntaxStatusRefreshBtn = document.getElementById("syntax-status-refresh");
const syntaxStatusTitle = document.getElementById("syntax-status-title");
const syntaxStatusDetail = document.getElementById("syntax-status-detail");
const configTabButtons = Array.from(document.querySelectorAll("[data-config-tab]"));
const configPanels = Array.from(document.querySelectorAll("[data-config-panel]"));
const botTelefoneInput = document.getElementById("bot-telefone");
const botAdicionarBtn = document.getElementById("bot-adicionar");
const listaBloqueios = document.getElementById("lista-bloqueios");
const listaRecentes = document.getElementById("lista-recentes");
const botMsgPalavrasInput = document.getElementById("bot-msg-palavras");
const botMsgTextoInput = document.getElementById("bot-msg-texto");
const botMsgSalvarBtn = document.getElementById("bot-msg-salvar");
const botMsgLimparBtn = document.getElementById("bot-msg-limpar");
const botMsgSugestoes = document.getElementById("bot-msg-sugestoes");
const botMsgLista = document.getElementById("bot-msg-lista");
let wppQrInterval = null;
let wppStatusInterval = null;
let botMensagensCache = [];
let botMensagemEditId = null;
let expoQrAtual = "";

function ativarAbaConfig(nomeAba, { salvarPreferencia = true } = {}) {
  const abaExiste = configPanels.some((panel) => panel.dataset.configPanel === nomeAba);
  const abaAtiva = abaExiste ? nomeAba : "loja";

  configTabButtons.forEach((button) => {
    const ativa = button.dataset.configTab === abaAtiva;
    button.classList.toggle("is-active", ativa);
    button.setAttribute("aria-selected", ativa ? "true" : "false");
  });
  configPanels.forEach((panel) => {
    const ativo = panel.dataset.configPanel === abaAtiva;
    panel.hidden = !ativo;
    panel.classList.toggle("is-active", ativo);
  });

  if (salvarPreferencia) {
    try {
      window.localStorage.setItem("mega-config-tab", abaAtiva);
    } catch (_) {
      // A tela continua funcionando quando o navegador bloqueia armazenamento local.
    }
  }
}

configTabButtons.forEach((button) => {
  button.setAttribute("role", "tab");
  button.addEventListener("click", () => ativarAbaConfig(button.dataset.configTab));
});

function mostrarAviso(texto) {
  if (!aviso) return;
  aviso.innerText = texto;
  aviso.style.display = "block";
  setTimeout(() => (aviso.style.display = "none"), 3000);
}

function gerarComandoPrintAgent() {
  const publicUrl = normalizePublicUrl(publicUrlInput?.value || "");
  const tokenAtual = String(printTokenInput?.value || "").trim() || "seu_token_aqui";
  const serverUrl = publicUrl || window.location.origin || "http://localhost:3000";
  const printInterface = String(printInterfaceInput?.value || "printer:POS80 Printer USB").trim();
  const windowsMode = String(printWindowsModeInput?.value || "raw").trim();
  const scaleX = String(printScaleXInput?.value || "2").trim();
  const scaleY = String(printScaleYInput?.value || "2").trim();
  const bold = printBoldInput?.checked === false ? "0" : "1";
  const maxCols = String(printMaxColsInput?.value || "34").trim();
  const comandoWindows = [
    `$env:MEGA_SERVER_URL=\"${serverUrl}\"`,
    `$env:PRINT_TOKEN=\"${tokenAtual}\"`,
    `$env:PRINT_INTERFACE=\"${printInterface}\"`,
    `$env:PRINT_WINDOWS_MODE=\"${windowsMode}\"`,
    `$env:PRINT_RAW_SCALE_X=\"${scaleX}\"`,
    `$env:PRINT_RAW_SCALE_Y=\"${scaleY}\"`,
    `$env:PRINT_RAW_BOLD=\"${bold}\"`,
    `$env:PRINT_MAX_COLS=\"${maxCols}\"`,
    "node scripts/print-agent.js",
  ].join("; ");

  const comandoLinux = [
    `MEGA_SERVER_URL=\"${serverUrl}\"`,
    `PRINT_TOKEN=\"${tokenAtual}\"`,
    `PRINT_INTERFACE=\"tcp://192.168.0.50:9100\"`,
    "node scripts/print-agent.js",
  ].join(" ");

  return `# Windows PowerShell\n${comandoWindows}\n\n# Linux\n${comandoLinux}`;
}

function atualizarComandoPrintAgent() {
  if (printCommandInput) printCommandInput.value = gerarComandoPrintAgent();
}

function setExpoStatus(texto) {
  if (expoStatus) expoStatus.textContent = `Status: ${texto || "--"}`;
}

const ATENDENTE_EXPO_GO_LINK = "exp://u.expo.dev/b33fe476-5364-4fc8-828a-244d6b04ba7d?runtime-version=exposdk%3A58.0.0&channel-name=expo-go";
const ATENDENTE_EXPO_GO_QR = "https://qr.expo.dev/eas-update?projectId=b33fe476-5364-4fc8-828a-244d6b04ba7d&runtimeVersion=exposdk%3A58.0.0&channel=expo-go&slug=exp";

function mostrarQrExpo(ativo) {
  const data = Boolean(ativo);
  if (expoQrImg) {
    expoQrImg.style.display = data ? "block" : "none";
    if (data) {
      expoQrImg.src = ATENDENTE_EXPO_GO_QR;
      expoQrImg.onerror = () => {
        expoQrImg.style.display = "none";
        if (expoQrPlaceholder) {
          expoQrPlaceholder.style.display = "block";
          expoQrPlaceholder.textContent = "QR do Expo indisponivel";
        }
        setExpoStatus("erro ao carregar QR");
      };
    } else {
      expoQrImg.removeAttribute("src");
    }
  }
  if (expoQrPlaceholder) {
    expoQrPlaceholder.style.display = data ? "none" : "block";
    if (!data) expoQrPlaceholder.textContent = "Expo offline ou sem tunel";
  }
}

function carregarExpoAtendente() {
  expoQrAtual = ATENDENTE_EXPO_GO_LINK;
  if (expoUrlInput) expoUrlInput.value = ATENDENTE_EXPO_GO_LINK;
  mostrarQrExpo(true);
  setExpoStatus("publicado no Expo · SDK 58");
}

async function copiarLinkExpo() {
  const link = String(expoUrlInput?.value || expoQrAtual || "").trim();
  if (!link) {
    mostrarAviso("Expo ainda nao esta online.");
    return;
  }
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(link);
      mostrarAviso("Link Expo copiado.");
      return;
    }
    window.prompt("Copie o link Expo:", link);
  } catch (err) {
    console.error(err);
    window.prompt("Copie o link Expo:", link);
  }
}

function normalizePublicUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const withScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(raw)
    ? raw
    : `https://${raw.replace(/^\/+/, "")}`;

  try {
    const parsed = new URL(withScheme);
    if (!parsed.hostname) return "";
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "");
  } catch (_) {
    return withScheme.replace(/\/+$/, "");
  }
}

async function copiarComandoPrintAgent() {
  try {
    const comando = gerarComandoPrintAgent();
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(comando);
      mostrarAviso("Comando de impressao copiado.");
      return;
    }
    window.prompt("Copie o comando abaixo:", comando);
  } catch (err) {
    console.error(err);
    mostrarAviso("Nao foi possivel copiar o comando.");
  }
}

function gerarIniciadorPrintAgent() {
  const publicUrl = normalizePublicUrl(publicUrlInput?.value || "");
  const serverUrl = publicUrl || window.location.origin || "http://localhost:3000";
  const tokenAtual = String(printTokenInput?.value || "").trim();
  const printInterface = String(printInterfaceInput?.value || "printer:POS80 Printer USB").trim();
  const windowsMode = String(printWindowsModeInput?.value || "raw").trim();
  const scaleX = String(printScaleXInput?.value || "2").trim();
  const scaleY = String(printScaleYInput?.value || "2").trim();
  const bold = printBoldInput?.checked === false ? "0" : "1";
  const maxCols = String(printMaxColsInput?.value || "34").trim();
  return [
    "@echo off",
    "title Mega Lanches - Impressao",
    "setlocal",
    "set \"MEGA_DIR=%USERPROFILE%\\Desktop\\mega-lanches\"",
    "if not exist \"%MEGA_DIR%\\scripts\\print-agent.js\" set \"MEGA_DIR=D:\\Usuario\\Desktop\\mega-lanches\"",
    "if not exist \"%MEGA_DIR%\\scripts\\print-agent.js\" set \"MEGA_DIR=%~dp0\"",
    "if not exist \"%MEGA_DIR%\\scripts\\print-agent.js\" (",
    "  echo Nao encontrei scripts\\print-agent.js.",
    "  echo Coloque este arquivo dentro da pasta mega-lanches ou ajuste MEGA_DIR.",
    "  pause",
    "  exit /b 1",
    ")",
    "cd /d \"%MEGA_DIR%\"",
    `set "MEGA_SERVER_URL=${serverUrl}"`,
    `set "PRINT_TOKEN=${tokenAtual}"`,
    `set "PRINT_INTERFACE=${printInterface}"`,
    `set "PRINT_WINDOWS_MODE=${windowsMode}"`,
    `set "PRINT_RAW_SCALE_X=${scaleX}"`,
    `set "PRINT_RAW_SCALE_Y=${scaleY}"`,
    `set "PRINT_RAW_BOLD=${bold}"`,
    `set "PRINT_MAX_COLS=${maxCols}"`,
    "echo Iniciando agente de impressao Mega Lanches...",
    "echo Servidor: %MEGA_SERVER_URL%",
    "echo Impressora: %PRINT_INTERFACE%",
    "node scripts\\print-agent.js",
    "echo.",
    "echo O agente de impressao foi finalizado.",
    "pause",
    "",
  ].join("\r\n");
}

function baixarIniciadorPrintAgent() {
  try {
    const blob = new Blob([gerarIniciadorPrintAgent()], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "iniciar-impressao.cmd";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    mostrarAviso("Iniciador de impressao baixado.");
  } catch (err) {
    console.error(err);
    mostrarAviso("Nao foi possivel baixar o iniciador.");
  }
}

async function limparFilaImpressao() {
  if (!confirm("Limpar todos os jobs pendentes da fila de impressao?")) return;
  try {
    const res = await authFetch("/adminn/print/clear", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      mostrarAviso("Nao foi possivel limpar a fila.");
      return;
    }
    const removidos = Number(data?.removed || 0);
    mostrarAviso(`Fila limpa (${removidos} removidos).`);
  } catch (err) {
    console.error(err);
    mostrarAviso("Erro ao limpar fila de impressao.");
  }
}

async function imprimirTeste() {
  try {
    const res = await authFetch("/adminn/print/test", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      mostrarAviso("Nao foi possivel enviar a impressao de teste.");
      return;
    }
    mostrarAviso("Notinha de teste enviada para a impressora.");
  } catch (err) {
    console.error(err);
    mostrarAviso("Erro ao enviar a impressao de teste.");
  }
}

function escapeHtml(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatarDataOutbox(valor) {
  if (!valor) return "--";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "--" : data.toLocaleString("pt-BR");
}

function nomeAcaoAuditoria(valor) {
  const chave = String(valor || "").toLowerCase();
  const nomes = {
    login_ok: "Login realizado",
    login_app_ok: "Login no app",
    logout: "Sessao encerrada",
    admin_user_created: "Conta administrativa criada",
    password_changed: "Senha alterada",
    password_reset_requested: "Recuperacao de senha solicitada",
    password_reset_completed: "Senha recuperada",
    combos_automaticos_ativados: "Geracao de combos ativada",
    combos_automaticos_pausados: "Geracao de combos pausada",
    logo_upload: "Logo atualizada",
    interpretador_feedback_registrado: "Correcao ensinada ao interpretador",
    interpretador_apelido_ativado: "Apelido do interpretador ativado",
    interpretador_apelido_desativado: "Apelido do interpretador desativado",
    interpretador_apelido_excluido: "Apelido do interpretador excluido",
  };
  return nomes[chave] || String(valor || "Acao administrativa").replaceAll("_", " ");
}

function renderizarAuditoriaAdmin(items) {
  if (!adminAuditList) return;
  if (!Array.isArray(items) || !items.length) {
    adminAuditList.innerHTML = "<p>Nenhuma acao registrada ainda.</p>";
    return;
  }
  adminAuditList.innerHTML = items.map((item) => `
    <article class="audit-item">
      <div>
        <strong>${escapeHtml(nomeAcaoAuditoria(item.acao))}</strong>
        <span>${escapeHtml(item.ator || "Administrador")}${item.entidade ? ` | ${escapeHtml(item.entidade)}` : ""}</span>
      </div>
      <div class="audit-meta">
        <time>${escapeHtml(formatarDataOutbox(item.created_at))}</time>
        ${item.ip ? `<small>IP ${escapeHtml(item.ip)}</small>` : ""}
      </div>
    </article>
  `).join("");
}

async function carregarAuditoriaAdmin() {
  if (!adminAuditList) return;
  if (adminAuditRefreshBtn) adminAuditRefreshBtn.disabled = true;
  try {
    const res = await authFetch(`/adminn/auditoria?limit=60&t=${Date.now()}`);
    const data = await res.json();
    if (!res.ok || data?.success === false) throw new Error(data?.error || "audit_error");
    renderizarAuditoriaAdmin(data.items);
  } catch (err) {
    console.error(err);
    adminAuditList.innerHTML = "<p>Nao foi possivel carregar o historico de seguranca.</p>";
  } finally {
    if (adminAuditRefreshBtn) adminAuditRefreshBtn.disabled = false;
  }
}

function renderizarParserAliases(items, learning = {}) {
  if (!parserAliasesList) return;
  const stats = document.getElementById("parser-learning-stats");
  if (stats) {
    const total = Number(learning.observations || 0);
    const corrected = Number(learning.corrected || 0);
    const rate = total > 0 ? ((corrected / total) * 100).toFixed(1) : "0.0";
    stats.innerHTML = `<strong>Observacoes estruturais</strong><span>${total} pedido(s) observado(s), ${corrected} revisado(s) (${rate}%). ${Number(learning.ambiguities || 0)} ambiguidade(s) e ${Number(learning.unknown || 0)} trecho(s) desconhecido(s). Nenhum dado pessoal e armazenado aqui.</span>`;
  }
  if (!Array.isArray(items) || !items.length) {
    parserAliasesList.innerHTML = "<p>O app ainda nao recebeu correcoes suficientes para aprender apelidos.</p>";
    return;
  }
  const statusAprendizado = {
    trusted: "confiavel",
    insufficient_confirmations: "aguardando repeticoes",
    low_accuracy: "pausado por baixa precisao",
    conflicting_products: "conflito entre produtos",
  };
  parserAliasesList.innerHTML = items.map((item) => `
    <article class="learning-item">
      <div><strong>"${escapeHtml(item.termo)}" &rarr; ${escapeHtml(item.produtoNome)}</strong><span>${Number(item.confirmacoes || 0)} confirmacao(oes) | ${Number(item.usos || 0)} uso(s) | ${Number(item.acertos || 0)} acerto(s) e ${Number(item.erros || 0)} erro(s) | ${item.precisao == null ? "sem amostra de precisao" : `${Number(item.precisao).toFixed(1)}% de acerto`} | ${item.ativo ? "ativo no app" : statusAprendizado[item.decisao] || "aguardando"}</span></div>
      <div class="config-actions">
        <button class="btn outline small" type="button" data-parser-alias-toggle="${Number(item.id)}" data-ativo="${item.ativo ? "0" : "1"}">${item.ativo ? "Desativar" : "Ativar"}</button>
        <button class="btn ghost small" type="button" data-parser-alias-delete="${Number(item.id)}">Excluir</button>
      </div>
    </article>
  `).join("");
}

async function carregarParserAliases() {
  if (!parserAliasesList) return;
  if (parserAliasesRefreshBtn) parserAliasesRefreshBtn.disabled = true;
  try {
    const res = await authFetch(`/adminn/parser-aliases?t=${Date.now()}`);
    const data = await res.json();
    if (!res.ok || data?.success === false) throw new Error(data?.error || "parser_aliases_error");
    renderizarParserAliases(data.items, data.learning);
  } catch (err) {
    console.error(err);
    parserAliasesList.innerHTML = "<p>Nao foi possivel carregar o aprendizado agora.</p>";
  } finally {
    if (parserAliasesRefreshBtn) parserAliasesRefreshBtn.disabled = false;
  }
}

async function alterarParserAlias(id, ativo) {
  const res = await authFetch(`/adminn/parser-aliases/${id}/ativar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ativo }),
  });
  const data = await res.json();
  if (!res.ok || data?.success === false) throw new Error(data?.error || "parser_alias_update_error");
  await carregarParserAliases();
  mostrarAviso(ativo ? "Apelido ativado no interpretador." : "Apelido desativado.");
}

async function excluirParserAlias(id) {
  if (!confirm("Excluir este aprendizado do interpretador?")) return;
  const res = await authFetch(`/adminn/parser-aliases/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok || data?.success === false) throw new Error(data?.error || "parser_alias_delete_error");
  await carregarParserAliases();
  mostrarAviso("Aprendizado excluido.");
}

async function carregarStatusSyntax() {
  if (!syntaxStatusTitle || !syntaxStatusDetail) return;
  if (syntaxStatusRefreshBtn) syntaxStatusRefreshBtn.disabled = true;
  try {
    const res = await authFetch(`/adminn/integracoes/syntax/status?t=${Date.now()}`);
    const data = await res.json();
    if (!res.ok || data?.success === false) throw new Error(data?.error || "syntax_status_error");
    if (data.ativo) {
      syntaxStatusTitle.textContent = `Syntax ativo em ${data.modo || "homologacao"}`;
      syntaxStatusDetail.textContent = `Fila: ${Number(data.fila?.pendentes || 0)} pendente(s), ${Number(data.fila?.erros || 0)} erro(s), ${Number(data.fila?.sincronizados || 0)} sincronizado(s).`;
    } else if (data.credenciaisConfiguradas) {
      syntaxStatusTitle.textContent = "Credenciais encontradas, aguardando mapeamento oficial da API";
      syntaxStatusDetail.textContent = "A integracao continua desativada e nenhuma venda sera enviada antes dos testes de homologacao.";
    } else {
      syntaxStatusTitle.textContent = "Aguardando documentacao e credencial de homologacao do Syntax";
      syntaxStatusDetail.textContent = "A fila segura ja foi preparada, mas permanece vazia e desativada.";
    }
  } catch (err) {
    console.error(err);
    syntaxStatusTitle.textContent = "Nao foi possivel consultar a integracao agora";
    syntaxStatusDetail.textContent = "Nenhuma venda foi enviada.";
  } finally {
    if (syntaxStatusRefreshBtn) syntaxStatusRefreshBtn.disabled = false;
  }
}

async function carregarStatusIaClientes() {
  if (!customerAiStatusTitle || !customerAiStatusDetail) return;
  try {
    const res = await authFetch(`/adminn/ia-clientes/status?t=${Date.now()}`);
    const data = await res.json();
    if (!res.ok || data?.success === false) throw new Error(data?.error || "customer_ai_status_error");
    if (!data.enabled) {
      customerAiStatusTitle.textContent = "IA local pausada";
      customerAiStatusDetail.textContent = "Ative o aprendizado novamente pelo painel IA Local.";
    } else {
      customerAiStatusTitle.textContent = `IA local ativa com ${data.model || "mega-local-v1"}`;
      customerAiStatusDetail.textContent = `${Number(data.cacheItems || 0)} perfil(is) aprendidos. ${data.privacy || "Nenhuma API externa e chamada."}`;
    }
  } catch (err) {
    console.error(err);
    customerAiStatusTitle.textContent = "Nao foi possivel consultar a IA agora";
    customerAiStatusDetail.textContent = "O atendimento e os padroes locais continuam funcionando.";
  }
}

function renderizarUsuariosAdmin(items) {
  if (!adminUsersList) return;
  adminUsersList.innerHTML = "";
  if (!Array.isArray(items) || !items.length) {
    adminUsersList.innerHTML = "<p>Nenhuma conta pessoal cadastrada.</p>";
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "whatsapp-card";
    row.innerHTML = `
      <strong>${escapeHtml(item.nome || "Administrador")}</strong>
      <div style="opacity:.75;margin-top:4px;">${escapeHtml(item.email || "")}</div>
      <div style="opacity:.6;font-size:.82rem;margin-top:4px;">
        ${item.ativo ? "Ativa" : "Desativada"} | ultimo acesso: ${escapeHtml(formatarDataOutbox(item.last_login_at))}
      </div>
    `;
    adminUsersList.appendChild(row);
  });
}

async function carregarUsuariosAdmin() {
  if (!adminUsersList) return;
  try {
    const res = await authFetch(`/adminn/usuarios?t=${Date.now()}`);
    const data = await res.json();
    if (!res.ok || data?.success === false) throw new Error(data?.error || "users_error");
    renderizarUsuariosAdmin(data.items);
  } catch (err) {
    console.error(err);
    adminUsersList.innerHTML = "<p>Nao foi possivel carregar as contas.</p>";
  }
}

async function carregarStatusEmailAdmin() {
  if (!adminEmailStatus) return;
  const statusCard = adminEmailStatus.closest(".email-recovery-card");
  try {
    const res = await authFetch(`/adminn/email/status?t=${Date.now()}`);
    const data = await res.json();
    if (!res.ok || data?.success === false) throw new Error(data?.error || "email_status_error");
    adminEmailStatus.textContent = data.configured
      ? `Ativada${data.from ? ` para envios por ${data.from}` : ""}.`
      : "Opcional e ainda desativada. O login normal continua funcionando.";
    statusCard?.classList.toggle("is-ready", Boolean(data.configured));
    statusCard?.classList.toggle("is-off", !data.configured);
    if (adminEmailTestBtn) adminEmailTestBtn.disabled = !data.configured;
  } catch (err) {
    console.error(err);
    adminEmailStatus.textContent = "Nao foi possivel verificar o envio de e-mail agora.";
    statusCard?.classList.remove("is-ready");
    statusCard?.classList.add("is-off");
    if (adminEmailTestBtn) adminEmailTestBtn.disabled = true;
  }
}

async function testarEmailAdmin() {
  if (!adminEmailTestBtn) return;
  adminEmailTestBtn.disabled = true;
  try {
    const res = await authFetch("/adminn/email/test", { method: "POST" });
    const data = await res.json();
    if (!res.ok || data?.success === false) throw new Error(data?.error || "smtp_test_error");
    mostrarAviso("E-mail de teste enviado para sua conta.");
  } catch (err) {
    console.error(err);
    mostrarAviso("Falha no teste de e-mail. Confira o SMTP.");
  } finally {
    await carregarStatusEmailAdmin();
  }
}

async function criarUsuarioAdmin() {
  const payload = {
    nome: String(adminUserNameInput?.value || "").trim(),
    email: String(adminUserEmailInput?.value || "").trim(),
    senha: String(adminUserPasswordInput?.value || ""),
    confirmarSenha: String(adminUserConfirmInput?.value || ""),
  };
  if (!payload.nome || !payload.email || !payload.senha || !payload.confirmarSenha) {
    return mostrarAviso("Preencha todos os dados da nova conta.");
  }
  if (payload.senha !== payload.confirmarSenha) return mostrarAviso("As senhas nao conferem.");
  adminUserCreateBtn.disabled = true;
  try {
    const res = await authFetch("/adminn/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data?.success === false) {
      throw new Error(data?.message || (data?.error === "email_exists" ? "Este e-mail ja esta cadastrado." : "Nao foi possivel criar a conta."));
    }
    adminUserNameInput.value = "";
    adminUserEmailInput.value = "";
    adminUserPasswordInput.value = "";
    adminUserConfirmInput.value = "";
    mostrarAviso("Conta administrativa criada.");
    await carregarUsuariosAdmin();
  } catch (err) {
    console.error(err);
    mostrarAviso(err?.message || "Nao foi possivel criar a conta.");
  } finally {
    adminUserCreateBtn.disabled = false;
  }
}

async function alterarMinhaSenha() {
  const payload = {
    senhaAtual: String(accountCurrentPasswordInput?.value || ""),
    novaSenha: String(accountNewPasswordInput?.value || ""),
    confirmarSenha: String(accountConfirmPasswordInput?.value || ""),
  };
  if (!payload.senhaAtual || !payload.novaSenha || !payload.confirmarSenha) {
    return mostrarAviso("Preencha os tres campos de senha.");
  }
  if (payload.novaSenha !== payload.confirmarSenha) return mostrarAviso("As novas senhas nao conferem.");
  accountChangePasswordBtn.disabled = true;
  try {
    const res = await authFetch("/adminn/conta/senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data?.success === false) {
      const mensagens = {
        invalid_current_password: "A senha atual esta incorreta.",
        password_mismatch: "As novas senhas nao conferem.",
        password_reused: "Escolha uma senha diferente da atual.",
        personal_account_required: "Crie sua conta pessoal antes de alterar a senha.",
      };
      throw new Error(data?.message || mensagens[data?.error] || "Nao foi possivel alterar a senha.");
    }
    window.location.href = "/adminn/login.html";
  } catch (err) {
    console.error(err);
    mostrarAviso(err?.message || "Nao foi possivel alterar a senha.");
  } finally {
    accountChangePasswordBtn.disabled = false;
  }
}

function renderizarWhatsappOutbox(data) {
  if (!whatsappOutboxList || !whatsappOutboxCounts) return;
  const counts = Object.fromEntries(
    (Array.isArray(data?.counts) ? data.counts : []).map((item) => [item.status, Number(item.total || 0)])
  );
  whatsappOutboxCounts.textContent = [
    `Pendentes: ${counts.pendente || 0}`,
    `Falharam: ${counts.falhou || 0}`,
    `Expiraram: ${counts.expirado || 0}`,
    `Enviadas: ${counts.enviado || 0}`,
  ].join(" | ");

  const items = Array.isArray(data?.items) ? data.items : [];
  whatsappOutboxList.innerHTML = "";
  if (!items.length) {
    whatsappOutboxList.innerHTML = "<p>Nenhum envio registrado.</p>";
    return;
  }

  items.slice(0, 50).forEach((item) => {
    const row = document.createElement("div");
    row.className = "whatsapp-card";
    const podeReenviar = item.status === "falhou" || item.status === "expirado";
    const pedido = item.pedido_id ? `Pedido #${item.pedido_id}` : "Resposta automatica";
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <strong>${escapeHtml(pedido)} - ${escapeHtml(item.tipo || "auto")}</strong>
          <div style="opacity:.72;font-size:.86rem;margin-top:3px;">
            ${escapeHtml(item.telefone || "")} | ${escapeHtml(item.status || "")} | tentativas: ${Number(item.attempts || 0)}
          </div>
        </div>
        ${podeReenviar ? `<button class="btn ghost" type="button" data-outbox-retry="${Number(item.id)}">Tentar novamente</button>` : ""}
      </div>
      <div style="margin-top:8px;white-space:pre-wrap;overflow-wrap:anywhere;">${escapeHtml(item.mensagem || "")}</div>
      <div style="opacity:.6;font-size:.8rem;margin-top:8px;">${escapeHtml(formatarDataOutbox(item.sent_at || item.updated_at))}</div>
      ${item.last_error ? `<div style="color:#b42318;font-size:.8rem;margin-top:6px;overflow-wrap:anywhere;">${escapeHtml(item.last_error)}</div>` : ""}
    `;
    whatsappOutboxList.appendChild(row);
  });
}

async function carregarWhatsappOutbox() {
  if (!whatsappOutboxList || !whatsappOutboxCounts) return;
  try {
    const res = await authFetch(`/adminn/whatsapp/outbox?limit=50&t=${Date.now()}`);
    const data = await res.json();
    if (!res.ok || data?.success === false) throw new Error(data?.error || "outbox_error");
    renderizarWhatsappOutbox(data);
  } catch (err) {
    console.error(err);
    whatsappOutboxCounts.textContent = "Nao foi possivel carregar os envios.";
  }
}

async function reenviarWhatsappOutbox(id) {
  try {
    const res = await authFetch(`/adminn/whatsapp/outbox/${Number(id)}/retry`, { method: "POST" });
    const data = await res.json();
    if (!res.ok || data?.success === false) throw new Error(data?.error || "retry_error");
    mostrarAviso("Mensagem colocada novamente na fila.");
    setTimeout(carregarWhatsappOutbox, 1200);
  } catch (err) {
    console.error(err);
    mostrarAviso("Nao foi possivel reenviar a mensagem.");
  }
}

function setWppStatus(texto) {
  if (!wppStatus) return;
  wppStatus.textContent = `Status: ${texto || "--"}`;
}

function mostrarQr(dataUrl) {
  if (!wppQrImg || !wppQrPlaceholder) return;
  if (!dataUrl) {
    wppQrImg.style.display = "none";
    wppQrImg.src = "";
    wppQrPlaceholder.style.display = "block";
    return;
  }
  wppQrImg.src = dataUrl;
  wppQrImg.style.display = "block";
  wppQrPlaceholder.style.display = "none";
}

function normalizarQrResposta(raw) {
  const valor = String(raw || "").trim();
  if (!valor) return "";

  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(valor)) {
    return valor;
  }

  if (/^https?:\/\//i.test(valor)) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(valor)}`;
  }

  if (/^[A-Za-z0-9+/=\r\n]+$/.test(valor) && valor.length > 120) {
    return `data:image/png;base64,${valor.replace(/\s+/g, "")}`;
  }

  return "";
}

function extrairStatusWpp(data) {
  if (!data) return "--";
  if (typeof data === "string") return data;
  const status =
    data?.status ||
    data?.state ||
    data?.response ||
    data?.message ||
    data?.result ||
    data?.data?.status ||
    data?.data?.state ||
    data?.data?.response;
  if (typeof status === "string") return status;
  if (typeof status === "boolean") return status ? "Conectado" : "Desconectado";
  if (typeof status === "object") return JSON.stringify(status);
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.data?.message === "string") return data.data.message;
  return "--";
}

async function atualizarStatusWpp() {
  if (!wppStatus) return;
  try {
    const res = await authFetch(`/adminn/wppconnect/status?t=${Date.now()}`);
    const data = await res.json();
    if (!res.ok || data?.ok === false) {
      setWppStatus("Nao conectado");
      return;
    }
    setWppStatus(extrairStatusWpp(data?.data || data));
  } catch (err) {
    console.error(err);
    setWppStatus("Erro");
  }
}

async function carregarQrWpp() {
  try {
    const res = await authFetch(`/adminn/wppconnect/qrcode?t=${Date.now()}`);
    const data = await res.json();
    if (!res.ok || data?.ok === false) {
      if (!wppQrImg || wppQrImg.style.display !== "block") mostrarQr("");
      return;
    }
    if (data?.pending) return;

    let raw = String(data?.dataUrl || data?.codeUrl || "").trim();
    if (!raw) {
      if (!wppQrImg || wppQrImg.style.display !== "block") mostrarQr("");
      return;
    }

    // Corrige respostas antigas que vinham no formato
    // data:image/png;base64,https://wa.me/settings/linked_devices#...
    if (/^data:image\/[a-zA-Z0-9.+-]+;base64,https?:\/\//i.test(raw)) {
      raw = raw.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, "");
    }

    if (/^https?:\/\//i.test(raw)) {
      const fallbackQr = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(raw)}`;
      mostrarQr(fallbackQr);
      return;
    }

    mostrarQr(raw);
  } catch (err) {
    console.error(err);
    if (!wppQrImg || wppQrImg.style.display !== "block") mostrarQr("");
  }
}

async function tentarQrAteDisponivel(tentativas = 6) {
  for (let i = 0; i < tentativas; i += 1) {
    await carregarQrWpp();
    if (wppQrImg && wppQrImg.style.display === "block") return true;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

async function iniciarSessaoWpp() {
  try {
    const res = await authFetch("/adminn/wppconnect/start", { method: "POST" });
    const data = await res.json();
    if (!res.ok || data?.ok === false) {
      mostrarAviso("Erro ao iniciar sessao do WhatsApp");
      return;
    }
    const qrInicio =
      normalizarQrResposta(data?.data?.qrcode) ||
      normalizarQrResposta(data?.data?.qr) ||
      normalizarQrResposta(data?.data?.codeUrl) ||
      normalizarQrResposta(data?.qrcode) ||
      normalizarQrResposta(data?.codeUrl);
    if (qrInicio) {
      mostrarQr(qrInicio);
    }
    await tentarQrAteDisponivel(6);
    iniciarPollingWpp();
    await atualizarStatusWpp();
  } catch (err) {
    console.error(err);
    mostrarAviso("Erro ao iniciar sessao do WhatsApp");
  }
}

function iniciarPollingWpp() {
  if (wppQrInterval) clearInterval(wppQrInterval);
  if (wppStatusInterval) clearInterval(wppStatusInterval);

  wppQrInterval = setInterval(() => {
    carregarQrWpp();
  }, 15000);

  wppStatusInterval = setInterval(() => {
    atualizarStatusWpp();
  }, 10000);
}

function renderBloqueios(lista) {
  if (!listaBloqueios) return;
  listaBloqueios.innerHTML = "";
  if (!Array.isArray(lista) || !lista.length) {
    listaBloqueios.innerHTML = "<p>Nenhum cliente bloqueado.</p>";
    return;
  }
  lista.forEach((item) => {
    const exp = item.expires_at ? new Date(item.expires_at).getTime() : 0;
    const restanteMin = exp ? Math.max(Math.ceil((exp - Date.now()) / 60000), 0) : 0;
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.gap = "10px";
    row.style.padding = "8px 10px";
    row.style.border = "1px solid rgba(15, 23, 42, 0.12)";
    row.style.borderRadius = "10px";
    row.style.marginBottom = "8px";
    row.innerHTML = `<div><strong>${item.telefone}</strong> <span style="opacity:0.6">(${restanteMin} min)</span></div>`;
    const btn = document.createElement("button");
    btn.className = "btn danger small";
    btn.textContent = "Desbloquear";
    btn.onclick = async () => {
      await authFetch(`/adminn/bot-bloqueios/remover/${item.id}`, { method: "DELETE" });
      carregarBloqueios();
    };
    row.appendChild(btn);
    listaBloqueios.appendChild(row);
  });
}

async function carregarBloqueios() {
  try {
    const res = await authFetch("/adminn/bot-bloqueios");
    const data = await res.json();
    renderBloqueios(data);
  } catch (err) {
    console.error(err);
  }
}

function renderRecentes(lista) {
  if (!listaRecentes) return;
  listaRecentes.innerHTML = "";
  if (!Array.isArray(lista) || !lista.length) {
    listaRecentes.innerHTML = "<p>Nenhum contato recente.</p>";
    return;
  }
  lista.forEach((item) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.gap = "10px";
    row.style.padding = "8px 10px";
    row.style.border = "1px solid rgba(15, 23, 42, 0.12)";
    row.style.borderRadius = "10px";
    row.style.marginBottom = "8px";
    row.innerHTML = `<div><strong>${item.telefone}</strong><div style="opacity:0.6;font-size:0.85rem;">${item.ultimo_texto || ""}</div></div>`;
    const btn = document.createElement("button");
    btn.className = "btn outline small";
    btn.textContent = "Pausar 5 min";
    btn.onclick = async () => {
      await authFetch("/adminn/bot-bloqueios/adicionar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: item.telefone, minutos: 5 }),
      });
      carregarBloqueios();
    };
    row.appendChild(btn);
    listaRecentes.appendChild(row);
  });
}

async function carregarRecentes() {
  try {
    const res = await authFetch("/adminn/bot-contatos");
    const data = await res.json();
    renderRecentes(data);
  } catch (err) {
    console.error(err);
  }
}

function limparFormBotMensagem() {
  botMensagemEditId = null;
  if (botMsgPalavrasInput) botMsgPalavrasInput.value = "";
  if (botMsgTextoInput) botMsgTextoInput.value = "";
  if (botMsgSalvarBtn) botMsgSalvarBtn.textContent = "Adicionar resposta";
}

function preencherFormBotMensagem(item) {
  botMensagemEditId = item.id;
  if (botMsgPalavrasInput) botMsgPalavrasInput.value = item.palavras_chave || "";
  if (botMsgTextoInput) botMsgTextoInput.value = item.mensagem || "";
  if (botMsgSalvarBtn) botMsgSalvarBtn.textContent = "Salvar alteracoes";
}

async function alternarBotMensagem(id, ativo) {
  const item = botMensagensCache.find((it) => it.id === id);
  if (!item) return;
  const payload = {
    palavras_chave: item.palavras_chave,
    mensagem: item.mensagem,
    ativo,
  };
  const res = await authFetch(`/adminn/bot-mensagens/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    mostrarAviso("Nao foi possivel atualizar a regra.");
    return;
  }
  carregarBotMensagens();
}

async function excluirBotMensagem(id) {
  if (!confirm("Excluir esta resposta automatica?")) return;
  const res = await authFetch(`/adminn/bot-mensagens/${id}`, { method: "DELETE" });
  if (!res.ok) {
    mostrarAviso("Nao foi possivel excluir a regra.");
    return;
  }
  if (botMensagemEditId === id) limparFormBotMensagem();
  carregarBotMensagens();
}

function renderBotMensagens() {
  if (!botMsgLista) return;
  botMsgLista.innerHTML = "";
  if (!Array.isArray(botMensagensCache) || !botMensagensCache.length) {
    botMsgLista.innerHTML = "<p>Nenhuma resposta cadastrada.</p>";
    return;
  }

  botMensagensCache.forEach((item) => {
    const row = document.createElement("div");
    row.style.border = "1px solid rgba(15, 23, 42, 0.12)";
    row.style.borderRadius = "10px";
    row.style.padding = "12px";
    row.style.marginBottom = "10px";
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <strong>Palavras: ${escapeHtml(item.palavras_chave)}</strong>
        <span style="opacity:0.7">${item.ativo ? "Ativa" : "Inativa"}</span>
      </div>
      <pre style="white-space:pre-wrap;margin:8px 0 10px;font-family:inherit;">${escapeHtml(item.mensagem)}</pre>
    `;

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.flexWrap = "wrap";

    const btnEditar = document.createElement("button");
    btnEditar.className = "btn ghost small";
    btnEditar.type = "button";
    btnEditar.textContent = "Editar";
    btnEditar.onclick = () => preencherFormBotMensagem(item);

    const btnAtivo = document.createElement("button");
    btnAtivo.className = item.ativo ? "btn outline small" : "btn primary small";
    btnAtivo.type = "button";
    btnAtivo.textContent = item.ativo ? "Desativar" : "Ativar";
    btnAtivo.onclick = () => alternarBotMensagem(item.id, !item.ativo);

    const btnExcluir = document.createElement("button");
    btnExcluir.className = "btn danger small";
    btnExcluir.type = "button";
    btnExcluir.textContent = "Excluir";
    btnExcluir.onclick = () => excluirBotMensagem(item.id);

    actions.appendChild(btnEditar);
    actions.appendChild(btnAtivo);
    actions.appendChild(btnExcluir);
    row.appendChild(actions);
    botMsgLista.appendChild(row);
  });
}

function renderSugestoesBotMensagens(sugestoes = []) {
  if (!botMsgSugestoes) return;
  botMsgSugestoes.innerHTML = "";
  if (!Array.isArray(sugestoes) || !sugestoes.length) {
    botMsgSugestoes.innerHTML = "<p>Nenhuma sugestao no momento.</p>";
    return;
  }

  sugestoes.forEach((item) => {
    const card = document.createElement("div");
    card.style.border = "1px solid rgba(15, 23, 42, 0.12)";
    card.style.borderRadius = "10px";
    card.style.padding = "10px";
    card.style.marginBottom = "10px";
    card.innerHTML = `
      <strong>${escapeHtml(item.titulo || "Sugestao")}</strong>
      <div style="opacity:0.75; margin:6px 0;">Palavras: ${escapeHtml(item.palavras_chave || "")}</div>
      <pre style="white-space:pre-wrap;margin:0;font-family:inherit;">${escapeHtml(item.mensagem || "")}</pre>
    `;

    const btnUsar = document.createElement("button");
    btnUsar.className = "btn outline small";
    btnUsar.type = "button";
    btnUsar.style.marginTop = "8px";
    btnUsar.textContent = "Usar sugestao";
    btnUsar.onclick = () => {
      botMensagemEditId = null;
      if (botMsgPalavrasInput) botMsgPalavrasInput.value = item.palavras_chave || "";
      if (botMsgTextoInput) botMsgTextoInput.value = item.mensagem || "";
      if (botMsgSalvarBtn) botMsgSalvarBtn.textContent = "Adicionar resposta";
      botMsgPalavrasInput?.focus();
    };

    card.appendChild(btnUsar);
    botMsgSugestoes.appendChild(card);
  });
}

async function carregarBotMensagens() {
  try {
    const res = await authFetch("/adminn/bot-mensagens");
    const data = await res.json();
    if (!res.ok) {
      mostrarAviso("Erro ao carregar mensagens do bot.");
      return;
    }
    botMensagensCache = Array.isArray(data?.itens) ? data.itens : [];
    renderBotMensagens();
    renderSugestoesBotMensagens(Array.isArray(data?.sugestoes) ? data.sugestoes : []);
  } catch (err) {
    console.error(err);
    mostrarAviso("Erro ao carregar mensagens do bot.");
  }
}

async function salvarBotMensagem() {
  const palavras = String(botMsgPalavrasInput?.value || "").trim();
  const mensagem = String(botMsgTextoInput?.value || "").trim();
  if (!palavras || !mensagem) {
    mostrarAviso("Preencha palavras chave e mensagem.");
    return;
  }

  const payload = { palavras_chave: palavras, mensagem, ativo: true };
  const editandoItem = botMensagensCache.find((item) => item.id === botMensagemEditId);
  if (editandoItem) payload.ativo = !!editandoItem.ativo;

  const url = botMensagemEditId ? `/adminn/bot-mensagens/${botMensagemEditId}` : "/adminn/bot-mensagens";
  const method = botMensagemEditId ? "PUT" : "POST";

  try {
    const res = await authFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      mostrarAviso("Nao foi possivel salvar a mensagem.");
      return;
    }
    mostrarAviso(botMensagemEditId ? "Mensagem atualizada." : "Mensagem adicionada.");
    limparFormBotMensagem();
    carregarBotMensagens();
  } catch (err) {
    console.error(err);
    mostrarAviso("Erro ao salvar mensagem.");
  }
}

async function carregarConfig() {
  try {
    const res = await authFetch("/adminn/config");
    const data = await res.json();
    if (entregaInput) entregaInput.value = data.tempo_entrega_min ?? "";
    if (retiradaInput) retiradaInput.value = data.tempo_retirada_min ?? "";
    if (whatsappInput) whatsappInput.value = data.whatsapp ?? "";
    if (publicUrlInput) publicUrlInput.value = data.public_url ?? "";
    selecionarTema("cardapio", data.tema_cardapio, { preview: false });
    selecionarTema("admin", data.tema_admin);
    if (msgPixInput) msgPixInput.value = data.msg_pix ?? "";
    if (promoUnidadeInput) promoUnidadeInput.value = data.promo_xtudo_preco_unidade ?? "";
    if (promoComboInput) promoComboInput.value = data.promo_xtudo_preco_combo ?? "";
    if (promoMinQtdInput) promoMinQtdInput.value = data.promo_xtudo_min_qtd ?? "";
    if (promoTagTextInput) promoTagTextInput.value = data.promo_tag_text ?? "";
    if (promoDestaqueTextInput) promoDestaqueTextInput.value = data.promo_destaque_text ?? "";
    if (promoSubTextInput) promoSubTextInput.value = data.promo_sub_text ?? "";
    if (logoUrlInput) logoUrlInput.value = data.logo_url ?? "";
    if (funcDiasInputs.length) {
      const dias = Array.isArray(data.funcionamento_dias) ? data.funcionamento_dias : [];
      funcDiasInputs.forEach((el) => {
        el.checked = dias.includes(parseInt(el.value, 10));
      });
    }
    if (funcAbreInput) funcAbreInput.value = data.funcionamento_abre ?? "";
    if (funcFechaInput) funcFechaInput.value = data.funcionamento_fecha ?? "";
    if (printTokenInput) printTokenInput.value = data.print_agent_token ?? "";
    if (printInterfaceInput) printInterfaceInput.value = data.print_interface ?? "printer:POS80 Printer USB";
    if (printWindowsModeInput) printWindowsModeInput.value = data.print_windows_mode ?? "raw";
    if (printScaleXInput) printScaleXInput.value = data.print_raw_scale_x ?? "2";
    if (printScaleYInput) printScaleYInput.value = data.print_raw_scale_y ?? "2";
    if (printBoldInput) printBoldInput.checked = data.print_raw_bold !== false;
    if (printMaxColsInput) printMaxColsInput.value = data.print_max_cols ?? "34";
    if (botAutoReplyInput) botAutoReplyInput.checked = data.bot_auto_reply_ativo !== false;
    if (autoAceitarInput) autoAceitarInput.checked = !!data.auto_aceitar_pedidos;
    if (autoImprimirInput) autoImprimirInput.checked = data.auto_imprimir_preparo !== false;
    atualizarComandoPrintAgent();
  } catch (err) {
    console.error(err);
    mostrarAviso("Erro ao carregar configuracoes");
  }
}

async function salvarConfig() {
  const payload = {
    tempo_entrega_min: entregaInput ? entregaInput.value : "",
    tempo_retirada_min: retiradaInput ? retiradaInput.value : "",
    whatsapp: whatsappInput ? whatsappInput.value : "",
    public_url: publicUrlInput ? normalizePublicUrl(publicUrlInput.value) : "",
    tema_cardapio: temaCardapioInput ? temaCardapioInput.value : "original",
    tema_admin: temaAdminInput ? temaAdminInput.value : "original",
    msg_pix: msgPixInput ? msgPixInput.value : "",
    promo_xtudo_preco_unidade: promoUnidadeInput ? promoUnidadeInput.value : "",
    promo_xtudo_preco_combo: promoComboInput ? promoComboInput.value : "",
    promo_xtudo_min_qtd: promoMinQtdInput ? promoMinQtdInput.value : "",
    promo_tag_text: promoTagTextInput ? promoTagTextInput.value : "",
    promo_destaque_text: promoDestaqueTextInput ? promoDestaqueTextInput.value : "",
    promo_sub_text: promoSubTextInput ? promoSubTextInput.value : "",
    logo_url: logoUrlInput ? logoUrlInput.value : "",
    funcionamento_dias: funcDiasInputs.filter((el) => el.checked).map((el) => parseInt(el.value, 10)),
    funcionamento_abre: funcAbreInput ? funcAbreInput.value : "",
    funcionamento_fecha: funcFechaInput ? funcFechaInput.value : "",
    bot_auto_reply_ativo: botAutoReplyInput ? botAutoReplyInput.checked : true,
    auto_aceitar_pedidos: autoAceitarInput ? autoAceitarInput.checked : false,
    auto_imprimir_preparo: autoImprimirInput ? autoImprimirInput.checked : true,
    print_agent_token: printTokenInput ? printTokenInput.value : "",
    print_interface: printInterfaceInput ? printInterfaceInput.value : "printer:POS80 Printer USB",
    print_windows_mode: printWindowsModeInput ? printWindowsModeInput.value : "raw",
    print_raw_scale_x: printScaleXInput ? printScaleXInput.value : "2",
    print_raw_scale_y: printScaleYInput ? printScaleYInput.value : "2",
    print_raw_bold: printBoldInput ? printBoldInput.checked : true,
    print_max_cols: printMaxColsInput ? printMaxColsInput.value : "34",
  };
  if (publicUrlInput) publicUrlInput.value = payload.public_url || "";

  try {
    const res = await authFetch("/adminn/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      mostrarAviso("Erro ao salvar configuracoes");
      return;
    }
    mostrarAviso("Configuracoes salvas!");
    if (typeof window.aplicarTemaVisualAdmin === "function") window.aplicarTemaVisualAdmin(payload.tema_admin);
    atualizarComandoPrintAgent();
  } catch (err) {
    console.error(err);
    mostrarAviso("Erro ao salvar configuracoes");
  }
}

async function uploadLogo() {
  if (!logoFileInput || !logoFileInput.files?.length) return;
  const file = logoFileInput.files[0];
  const form = new FormData();
  form.append("imagem", file);
  try {
    const res = await authFetch("/adminn/logo-upload", {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error("Falha no upload da logo");
    const data = await res.json();
    if (data?.success && logoUrlInput) {
      logoUrlInput.value = data.logoUrl || data.imageUrl || "";
      mostrarAviso("Logo enviada. Clique em Salvar.");
    } else {
      mostrarAviso("Erro ao enviar logo.");
    }
  } catch (err) {
    console.error(err);
    mostrarAviso("Erro ao enviar logo.");
  }
}

if (logoFileInput) {
  logoFileInput.addEventListener("change", uploadLogo);
}

async function desconectarWpp() {
  if (!confirm("Deseja desconectar o WhatsApp agora?")) return;
  try {
    const res = await authFetch("/adminn/wppconnect/logout", { method: "POST" });
    const data = await res.json();
    if (!res.ok || data?.ok === false) {
      mostrarAviso("Erro ao desconectar o WhatsApp");
      return;
    }
    mostrarQr("");
    await atualizarStatusWpp();
    mostrarAviso("WhatsApp desconectado.");
  } catch (err) {
    console.error(err);
    mostrarAviso("Erro ao desconectar o WhatsApp");
  }
}

salvarBtn && salvarBtn.addEventListener("click", salvarConfig);
recarregarBtn && recarregarBtn.addEventListener("click", carregarConfig);
wppStartBtn && wppStartBtn.addEventListener("click", iniciarSessaoWpp);
wppRefreshBtn && wppRefreshBtn.addEventListener("click", atualizarStatusWpp);
wppDisconnectBtn && wppDisconnectBtn.addEventListener("click", desconectarWpp);
whatsappOutboxRefreshBtn && whatsappOutboxRefreshBtn.addEventListener("click", carregarWhatsappOutbox);
adminUsersRefreshBtn && adminUsersRefreshBtn.addEventListener("click", carregarUsuariosAdmin);
adminUserCreateBtn && adminUserCreateBtn.addEventListener("click", criarUsuarioAdmin);
accountChangePasswordBtn && accountChangePasswordBtn.addEventListener("click", alterarMinhaSenha);
adminEmailTestBtn && adminEmailTestBtn.addEventListener("click", testarEmailAdmin);
adminAuditRefreshBtn && adminAuditRefreshBtn.addEventListener("click", carregarAuditoriaAdmin);
parserAliasesRefreshBtn && parserAliasesRefreshBtn.addEventListener("click", carregarParserAliases);
syntaxStatusRefreshBtn && syntaxStatusRefreshBtn.addEventListener("click", carregarStatusSyntax);
parserAliasesList && parserAliasesList.addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-parser-alias-toggle]");
  const remover = event.target.closest("[data-parser-alias-delete]");
  if (toggle) alterarParserAlias(toggle.dataset.parserAliasToggle, toggle.dataset.ativo === "1").catch((err) => {
    console.error(err);
    mostrarAviso("Nao foi possivel alterar o aprendizado.");
  });
  if (remover) excluirParserAlias(remover.dataset.parserAliasDelete).catch((err) => {
    console.error(err);
    mostrarAviso("Nao foi possivel excluir o aprendizado.");
  });
});
whatsappOutboxList && whatsappOutboxList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-outbox-retry]");
  if (!button) return;
  reenviarWhatsappOutbox(button.dataset.outboxRetry);
});
botMsgSalvarBtn && botMsgSalvarBtn.addEventListener("click", salvarBotMensagem);
botMsgLimparBtn && botMsgLimparBtn.addEventListener("click", limparFormBotMensagem);
copyPrintCmdBtn && copyPrintCmdBtn.addEventListener("click", copiarComandoPrintAgent);
downloadPrintCmdBtn && downloadPrintCmdBtn.addEventListener("click", baixarIniciadorPrintAgent);
testPrintBtn && testPrintBtn.addEventListener("click", imprimirTeste);
clearPrintQueueBtn && clearPrintQueueBtn.addEventListener("click", limparFilaImpressao);
copyExpoUrlBtn && copyExpoUrlBtn.addEventListener("click", copiarLinkExpo);
refreshExpoBtn && refreshExpoBtn.addEventListener("click", carregarExpoAtendente);
[publicUrlInput, printTokenInput, printInterfaceInput, printWindowsModeInput, printScaleXInput, printScaleYInput, printBoldInput, printMaxColsInput]
  .filter(Boolean)
  .forEach((el) => {
    el.addEventListener("input", () => {
      atualizarComandoPrintAgent();
    });
    el.addEventListener("change", () => {
      atualizarComandoPrintAgent();
    });
  });

window.addEventListener("load", () => {
  iniciarCartoesTema();
  let abaInicial = "loja";
  try {
    abaInicial = window.localStorage.getItem("mega-config-tab") || abaInicial;
  } catch (_) {
    // Usa a primeira aba quando o armazenamento local nao esta disponivel.
  }
  ativarAbaConfig(abaInicial, { salvarPreferencia: false });
  carregarConfig();
  atualizarComandoPrintAgent();
  carregarExpoAtendente();
  atualizarStatusWpp();
  carregarQrWpp();
  iniciarPollingWpp();
  carregarWhatsappOutbox();
  carregarUsuariosAdmin();
  carregarStatusEmailAdmin();
  carregarAuditoriaAdmin();
  carregarParserAliases();
  carregarStatusIaClientes();
  carregarStatusSyntax();
  carregarBotMensagens();
});
