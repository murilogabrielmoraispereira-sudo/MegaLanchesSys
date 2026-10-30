const passwordInput = document.getElementById("reset-password");
const confirmInput = document.getElementById("reset-confirm");
const resetButton = document.getElementById("btn-reset-password");
const backButton = document.getElementById("btn-reset-back");
const helper = document.getElementById("reset-helper");
const aviso = document.getElementById("aviso");

const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
const resetToken = String(fragment.get("token") || "");
const resetEmail = String(fragment.get("email") || "").trim().toLowerCase();
history.replaceState(null, "", window.location.pathname);

function mostrarAviso(texto) {
  if (!aviso) return;
  aviso.innerText = texto;
  aviso.style.display = "block";
  setTimeout(() => (aviso.style.display = "none"), 4500);
}

function invalidarFormulario(texto) {
  if (helper) helper.textContent = texto;
  if (passwordInput) passwordInput.disabled = true;
  if (confirmInput) confirmInput.disabled = true;
  if (resetButton) resetButton.disabled = true;
}

async function redefinirSenha() {
  const novaSenha = String(passwordInput?.value || "");
  const confirmarSenha = String(confirmInput?.value || "");
  if (!resetToken || !resetEmail) return invalidarFormulario("Link de recuperacao invalido.");
  if (!novaSenha || !confirmarSenha) return mostrarAviso("Preencha e confirme a nova senha.");
  if (novaSenha !== confirmarSenha) return mostrarAviso("As senhas nao conferem.");

  resetButton.disabled = true;
  resetButton.textContent = "Alterando...";
  try {
    const res = await fetch("/adminn/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: resetEmail,
        token: resetToken,
        novaSenha,
        confirmarSenha,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      const mensagens = {
        invalid_or_expired_token: "Este link e invalido, expirou ou ja foi utilizado.",
        password_mismatch: "As senhas nao conferem.",
        password_reused: "Escolha uma senha diferente da anterior.",
        too_many_attempts: "Muitas tentativas. Aguarde alguns minutos.",
      };
      throw new Error(data?.message || mensagens[data?.error] || "Nao foi possivel redefinir a senha.");
    }
    mostrarAviso("Senha alterada. Entre novamente.");
    setTimeout(() => {
      window.location.href = "/adminn/login.html";
    }, 1200);
  } catch (err) {
    mostrarAviso(err?.message || "Nao foi possivel redefinir a senha.");
    resetButton.disabled = false;
    resetButton.textContent = "Redefinir senha";
  }
}

if (!resetToken || !resetEmail) invalidarFormulario("Link de recuperacao invalido.");
resetButton?.addEventListener("click", redefinirSenha);
backButton?.addEventListener("click", () => {
  window.location.href = "/adminn/login.html";
});
confirmInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") redefinirSenha();
});
