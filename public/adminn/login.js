const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const aviso = document.getElementById("aviso");
const btnLogin = document.getElementById("btn-login");
const loginForm = document.getElementById("login-form");
const loginHelper = document.getElementById("login-helper");
const setupForm = document.getElementById("setup-form");
const setupNomeInput = document.getElementById("setup-nome");
const setupEmailInput = document.getElementById("setup-email");
const setupSenhaAtualInput = document.getElementById("setup-senha-atual");
const setupSenhaInput = document.getElementById("setup-senha");
const setupConfirmarInput = document.getElementById("setup-confirmar");
const btnRegister = document.getElementById("btn-register");
const btnShowLogin = document.getElementById("btn-show-login");
const forgotForm = document.getElementById("forgot-form");
const forgotEmailInput = document.getElementById("forgot-email");
const btnForgotPassword = document.getElementById("btn-forgot-password");
const btnSendReset = document.getElementById("btn-send-reset");
const btnBackLogin = document.getElementById("btn-back-login");
const accountList = document.getElementById("account-list");
const accountListLabel = document.getElementById("account-list-label");
let loginEmAndamento = false;
let setupRequired = false;
let passwordResetEnabled = false;
let selectedAccountId = "";
let loginEmailFallback = false;

function mostrarAviso(texto) {
  if (!aviso) return;
  aviso.innerText = texto;
  aviso.style.display = "block";
  setTimeout(() => (aviso.style.display = "none"), 4000);
}

function mostrarCadastro() {
  if (loginForm) loginForm.hidden = true;
  if (forgotForm) forgotForm.hidden = true;
  if (setupForm) setupForm.hidden = false;
  setupNomeInput?.focus();
}

function mostrarLoginLegado() {
  if (setupForm) setupForm.hidden = true;
  if (forgotForm) forgotForm.hidden = true;
  if (loginForm) loginForm.hidden = false;
  if (emailInput) emailInput.hidden = !loginEmailFallback;
  if (accountList) accountList.hidden = setupRequired || loginEmailFallback;
  if (accountListLabel) {
    accountListLabel.hidden = setupRequired;
    accountListLabel.textContent = loginEmailFallback ? "E-mail" : "Quem esta acessando?";
  }
  if (loginHelper) {
    loginHelper.textContent = setupRequired
      ? "Use temporariamente a senha administrativa atual. Recomendamos criar sua conta pessoal."
      : "Escolha quem esta acessando e informe a senha.";
  }
  if (btnForgotPassword) btnForgotPassword.hidden = setupRequired || !passwordResetEnabled;
  senhaInput?.focus();
}

function obterIniciais(nome) {
  return String(nome || "A")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("") || "A";
}

function selecionarConta(id) {
  selectedAccountId = String(id || "");
  accountList?.querySelectorAll("[data-account-id]").forEach((button) => {
    button.classList.toggle("ativo", button.dataset.accountId === selectedAccountId);
    button.setAttribute("aria-pressed", button.dataset.accountId === selectedAccountId ? "true" : "false");
  });
  senhaInput?.focus();
}

function ativarLoginPorEmailFallback() {
  loginEmailFallback = true;
  if (accountList) accountList.hidden = true;
  if (accountListLabel) {
    accountListLabel.hidden = false;
    accountListLabel.textContent = "E-mail";
  }
  if (emailInput) emailInput.hidden = false;
  if (loginHelper) loginHelper.textContent = "Entre com seu e-mail e senha.";
}

async function carregarContasLogin() {
  if (!accountList || setupRequired) return;
  try {
    const res = await fetch(`/adminn/auth/accounts?t=${Date.now()}`, {
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    if (!res.ok || data?.success === false) throw new Error("accounts_unavailable");
    const items = Array.isArray(data?.items) ? data.items : [];
    accountList.innerHTML = "";
    items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "account-option";
      button.dataset.accountId = String(item.id || "");
      button.setAttribute("aria-pressed", "false");
      const avatar = document.createElement("span");
      avatar.className = "account-avatar";
      avatar.textContent = obterIniciais(item.name);
      const nome = document.createElement("span");
      nome.textContent = String(item.name || "Administrador");
      button.append(avatar, nome);
      button.addEventListener("click", () => selecionarConta(button.dataset.accountId));
      accountList.appendChild(button);
    });
    if (items.length === 1) selecionarConta(items[0].id);
    if (!items.length) ativarLoginPorEmailFallback();
  } catch {
    ativarLoginPorEmailFallback();
  }
}

function mostrarRecuperacao() {
  if (!passwordResetEnabled) return;
  if (loginForm) loginForm.hidden = true;
  if (setupForm) setupForm.hidden = true;
  if (forgotForm) forgotForm.hidden = false;
  if (forgotEmailInput && emailInput?.value) forgotEmailInput.value = emailInput.value;
  forgotEmailInput?.focus();
}

async function carregarEstadoCadastro() {
  try {
    const res = await fetch(`/adminn/auth/setup-status?t=${Date.now()}`, {
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    setupRequired = Boolean(data?.setupRequired);
    passwordResetEnabled = Boolean(data?.passwordResetEnabled);
    if (setupRequired) mostrarCadastro();
    else {
      mostrarLoginLegado();
      await carregarContasLogin();
    }
  } catch {
    mostrarLoginLegado();
  }
}

async function solicitarRecuperacao() {
  const email = String(forgotEmailInput?.value || "").trim();
  if (!email) return mostrarAviso("Digite o e-mail da conta.");
  btnSendReset.disabled = true;
  btnSendReset.textContent = "Enviando...";
  try {
    const res = await fetch("/adminn/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error("Nao foi possivel solicitar a recuperacao agora.");
    mostrarAviso(data?.message || "Confira seu e-mail para continuar.");
    mostrarLoginLegado();
  } catch (err) {
    mostrarAviso(err?.message || "Nao foi possivel solicitar a recuperacao.");
  } finally {
    btnSendReset.disabled = false;
    btnSendReset.textContent = "Enviar link de recuperacao";
  }
}

async function login() {
  if (loginEmAndamento) return;
  const email = String(emailInput?.value || "").trim();
  const senha = String(senhaInput?.value || "");
  if (!senha) return mostrarAviso("Digite a senha.");
  if (!setupRequired && !selectedAccountId && !email) {
    return mostrarAviso(emailInput?.hidden ? "Escolha quem esta acessando." : "Digite o e-mail.");
  }

  loginEmAndamento = true;
  btnLogin.disabled = true;
  btnLogin.textContent = "Entrando...";
  try {
    const res = await fetch("/adminn/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId: selectedAccountId, email, senha }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      if (res.status === 429) throw new Error("Muitas tentativas. Aguarde alguns minutos.");
      throw new Error("E-mail ou senha incorretos.");
    }
    window.location.href = "/adminn/painel.html";
  } catch (err) {
    mostrarAviso(err?.message || "Nao foi possivel entrar.");
    senhaInput.value = "";
  } finally {
    loginEmAndamento = false;
    btnLogin.disabled = false;
    btnLogin.textContent = "Entrar";
  }
}

async function registrarPrimeiraConta() {
  if (loginEmAndamento) return;
  const payload = {
    nome: String(setupNomeInput?.value || "").trim(),
    email: String(setupEmailInput?.value || "").trim(),
    senhaAtual: String(setupSenhaAtualInput?.value || ""),
    senha: String(setupSenhaInput?.value || ""),
    confirmarSenha: String(setupConfirmarInput?.value || ""),
  };
  if (!payload.nome || !payload.email || !payload.senhaAtual || !payload.senha || !payload.confirmarSenha) {
    return mostrarAviso("Preencha todos os campos.");
  }
  if (payload.senha !== payload.confirmarSenha) return mostrarAviso("As novas senhas nao conferem.");

  loginEmAndamento = true;
  btnRegister.disabled = true;
  btnRegister.textContent = "Criando conta...";
  try {
    const res = await fetch("/adminn/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      const mensagens = {
        invalid_current_password: "A senha administrativa atual esta incorreta.",
        invalid_email: "Informe um e-mail valido.",
        password_mismatch: "As novas senhas nao conferem.",
        setup_completed: "A primeira conta ja foi criada. Entre normalmente.",
      };
      throw new Error(data?.message || mensagens[data?.error] || "Nao foi possivel criar a conta.");
    }
    window.location.href = "/adminn/painel.html";
  } catch (err) {
    mostrarAviso(err?.message || "Nao foi possivel criar a conta.");
  } finally {
    loginEmAndamento = false;
    btnRegister.disabled = false;
    btnRegister.textContent = "Criar conta segura";
  }
}

if (window.location.pathname.endsWith("/adminn/login.html") && window.location.hash) {
  history.replaceState(null, "", "/adminn/login.html");
}

btnLogin?.addEventListener("click", login);
btnRegister?.addEventListener("click", registrarPrimeiraConta);
btnShowLogin?.addEventListener("click", mostrarLoginLegado);
btnForgotPassword?.addEventListener("click", mostrarRecuperacao);
btnBackLogin?.addEventListener("click", mostrarLoginLegado);
btnSendReset?.addEventListener("click", solicitarRecuperacao);
senhaInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") login();
});
setupConfirmarInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") registrarPrimeiraConta();
});

carregarEstadoCadastro();
