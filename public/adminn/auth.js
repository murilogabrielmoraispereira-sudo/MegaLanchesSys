function getCookieValue(name) {
  return document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";
}

function shouldSendCsrf(method) {
  return !["GET", "HEAD", "OPTIONS"].includes(String(method || "GET").toUpperCase());
}

async function authFetch(url, options = {}) {
  const requestOptions = { ...options };
  const method = String(requestOptions.method || "GET").toUpperCase();

  if (shouldSendCsrf(method)) {
    const headers = new Headers(requestOptions.headers || {});
    const csrf = decodeURIComponent(getCookieValue("admin_csrf"));
    if (csrf && !headers.has("X-CSRF-Token")) headers.set("X-CSRF-Token", csrf);
    requestOptions.headers = headers;
  }

  const res = await fetch(url, requestOptions);
  if (res.status === 401) {
    window.location.href = "/adminn/login.html";
    throw new Error("unauthorized");
  }
  if (res.status === 403) {
    try {
      const data = await res.clone().json();
      if (data?.error === "csrf_invalid") {
        alert("Sessao expirada ou invalida. Entre novamente.");
        window.location.href = "/adminn/login.html";
      }
    } catch (err) {
      // segue com a resposta original para a tela tratar
    }
  }
  return res;
}

function setupLogout() {
  const btn = document.getElementById("btn-logout");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    try {
      await authFetch("/adminn/logout", { method: "POST" });
    } catch (err) {
      // ignore
    } finally {
      window.location.href = "/adminn/login.html";
    }
  });
}

const THEME_STORAGE_KEY = "admin_theme";
const ADMIN_VISUAL_THEME_STORAGE_KEY = "admin_visual_theme";
const ADMIN_VISUAL_THEMES = ["original", "copa-brasil", "chapa-fogo", "diner-retro", "neon-noturno", "fliperama-90", "rota-66", "boteco-raiz", "aranha-urbana"];
const FORCE_DARK_CLASS = "admin-login";

function garantirCssTemasAdmin() {
  if (document.querySelector('link[data-admin-themes="1"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/adminn/admin-themes.css?v=20260814-homem-aranha-teias-v3";
  link.dataset.adminThemes = "1";
  document.head.appendChild(link);
}

function aplicarTemaVisualAdmin(theme, { persist = true } = {}) {
  const normalized = ADMIN_VISUAL_THEMES.includes(theme) ? theme : "original";
  ADMIN_VISUAL_THEMES.forEach((value) => document.body.classList.remove(`admin-theme-${value}`));
  document.body.classList.add(`admin-theme-${normalized}`);
  document.body.dataset.adminVisualTheme = normalized;
  if (persist) {
    try { localStorage.setItem(ADMIN_VISUAL_THEME_STORAGE_KEY, normalized); } catch (_) {}
  }
  return normalized;
}

async function carregarTemaVisualAdmin() {
  if (document.body.classList.contains(FORCE_DARK_CLASS)) return;
  try {
    const response = await fetch("/adminn/aparencia", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    aplicarTemaVisualAdmin(data.tema_admin);
  } catch (_) {
    // Mantem a ultima preferencia local quando o servidor esta temporariamente indisponivel.
  }
}

function aplicarTema(theme) {
  const forceDark = document.body.classList.contains(FORCE_DARK_CLASS) || document.body.dataset.themeLock === "dark";
  const dark = forceDark ? true : theme === "dark";
  document.body.classList.toggle("dark", dark);
  const toggleBtn = document.getElementById("toggle-theme");
  if (toggleBtn) {
    toggleBtn.textContent = dark ? "Tema: Escuro" : "Tema: Claro";
    toggleBtn.setAttribute("aria-pressed", dark ? "true" : "false");
    toggleBtn.title = dark ? "Clique para tema claro" : "Clique para tema escuro";
  }
}

function inicializarToggleTema() {
  const forceDark = document.body.classList.contains(FORCE_DARK_CLASS) || document.body.dataset.themeLock === "dark";
  let toggleBtn = document.getElementById("toggle-theme");
  if (!toggleBtn) {
    const actions = document.querySelector(".header-actions");
    if (actions) {
      toggleBtn = document.createElement("button");
      toggleBtn.id = "toggle-theme";
      toggleBtn.type = "button";
      toggleBtn.className = "btn ghost theme-toggle";
      toggleBtn.textContent = "Tema: Claro";
      const logout = document.getElementById("btn-logout");
      if (logout && logout.parentElement === actions) {
        actions.insertBefore(toggleBtn, logout);
      } else {
        actions.appendChild(toggleBtn);
      }
    }
  }
  if (!toggleBtn) return;

  if (forceDark) {
    aplicarTema("dark");
    toggleBtn.style.display = "none";
    return;
  }

  const salvo = localStorage.getItem(THEME_STORAGE_KEY);
  const themeInicial = salvo === "dark" ? "dark" : "light";
  aplicarTema(themeInicial);

  toggleBtn.addEventListener("click", () => {
    const atual = document.body.classList.contains("dark") ? "dark" : "light";
    const proximo = atual === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_STORAGE_KEY, proximo);
    aplicarTema(proximo);
  });
}

window.authFetch = authFetch;
window.setupLogout = setupLogout;
window.inicializarToggleTema = inicializarToggleTema;
window.aplicarTemaVisualAdmin = aplicarTemaVisualAdmin;
document.addEventListener("DOMContentLoaded", () => {
  garantirCssTemasAdmin();
  let visualTheme = "original";
  try { visualTheme = localStorage.getItem(ADMIN_VISUAL_THEME_STORAGE_KEY) || visualTheme; } catch (_) {}
  aplicarTemaVisualAdmin(visualTheme, { persist: false });
  inicializarToggleTema();
  setupLogout();
  carregarTemaVisualAdmin();
});
