import * as SecureStore from "expo-secure-store";
import { API_URL, assertApiUrl } from "../config/env";
import type { AppUser, Catalog, CatalogProduct, ContactMatch, CreatedOrder, CustomerAiInsight, CustomerHistory, DeliveryPerson, LoginAccount, ManagedOrder, OrderDetails, OrderQuote, ParserLearningAssociation, ParserLearningUse, ParserObservation } from "../types";

const TOKEN_KEY = "mega_lanches_atendente_token";
let unauthorizedHandler: (() => void | Promise<void>) | null = null;
let unauthorizedNotificationPending = false;

export function setUnauthorizedHandler(handler: (() => void | Promise<void>) | null) {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

async function notifyUnauthorized() {
  if (unauthorizedNotificationPending) return;
  unauthorizedNotificationPending = true;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await unauthorizedHandler?.();
  } finally {
    unauthorizedNotificationPending = false;
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  assertApiUrl();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) await notifyUnauthorized();
    const error = new Error(data?.message || data?.error || "Falha na comunicacao com o servidor.");
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return data as T;
}

export async function restoreToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearStoredToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof Error && (error as Error & { status?: number }).status === 401;
}

export async function loadLoginAccounts() {
  const data = await request<{ success: boolean; setupRequired?: boolean; items?: LoginAccount[] }>("/api/atendente/accounts");
  const items = Array.isArray(data.items)
    ? data.items.filter((item) => item && typeof item.id === "string" && typeof item.name === "string")
    : [];
  return { items, setupRequired: Boolean(data.setupRequired) };
}

export async function publicLogin() {
  const data = await request<{ success: boolean; token: string }>("/api/atendente/public-login", {
    method: "POST",
  });
  await SecureStore.setItemAsync(TOKEN_KEY, data.token);
  return data.token;
}

export async function login(identifier: string, senha: string, useEmail = false) {
  const data = await request<{ success: boolean; token: string; user?: AppUser }>("/api/atendente/login", {
    method: "POST",
    body: JSON.stringify(useEmail
      ? { email: identifier.trim().toLowerCase(), senha }
      : { loginId: identifier.trim(), senha }),
  });
  await SecureStore.setItemAsync(TOKEN_KEY, data.token);
  return data.token;
}

export async function logout(token: string) {
  try {
    await request("/api/atendente/logout", { method: "POST" }, token);
  } finally {
    await clearStoredToken();
  }
}

export async function loadCatalog(token: string) {
  const data = await request<{ success: boolean } & Catalog>("/api/atendente/catalogo", {}, token);
  return {
    ...data,
    cardapio: (Array.isArray(data.cardapio) ? data.cardapio : []).map((product) => ({
      ...product,
      ingredientes: Array.isArray(product?.ingredientes) ? product.ingredientes : [],
      apelidos: Array.isArray(product?.apelidos) ? product.apelidos : [],
    })),
    adicionais: Array.isArray(data.adicionais) ? data.adicionais : [],
  };
}

export async function loadMe(token: string) {
  const data = await request<{ success: boolean; user: AppUser }>("/api/atendente/me", {}, token);
  return data.user;
}

export async function loadOrders(token: string) {
  const data = await request<{ success: boolean; pedidos: ManagedOrder[] }>("/api/atendente/pedidos", {}, token);
  return Array.isArray(data.pedidos) ? data.pedidos : [];
}

export async function updateOrderStatus(token: string, pedidoId: number, status: string, entregador = "") {
  const data = await request<{ success: boolean; pedido: ManagedOrder }>(
    `/api/atendente/pedidos/${pedidoId}/status`,
    { method: "PATCH", body: JSON.stringify({ status, entregador }) },
    token
  );
  return data.pedido;
}

export async function reprintOrder(token: string, pedidoId: number) {
  return request<{ success: boolean }>(
    `/api/atendente/pedidos/${pedidoId}/imprimir`,
    { method: "POST" },
    token
  );
}

export async function loadDeliveryPeople(token: string) {
  const data = await request<{ success: boolean; entregadores: DeliveryPerson[] }>(
    "/api/atendente/entregadores",
    {},
    token
  );
  return Array.isArray(data.entregadores) ? data.entregadores : [];
}

export async function loadManagedMenu(token: string) {
  const data = await request<{
    success: boolean;
    itens: Array<CatalogProduct & { order_index?: number; img?: string }>;
    adicionais: Catalog["adicionais"];
    categorias: Array<{ id: number; nome: string; slug: string; order_index?: number }>;
  }>("/api/atendente/cardapio", {}, token);
  return {
    ...data,
    itens: (Array.isArray(data.itens) ? data.itens : []).map((product) => ({
      ...product,
      ingredientes: Array.isArray(product?.ingredientes) ? product.ingredientes : [],
      apelidos: Array.isArray(product?.apelidos) ? product.apelidos : [],
    })),
    adicionais: Array.isArray(data.adicionais) ? data.adicionais : [],
    categorias: Array.isArray(data.categorias) ? data.categorias : [],
  };
}

export async function saveMenuProduct(token: string, product: Partial<CatalogProduct> & { id?: string | number }) {
  const isEdit = product.id !== undefined && product.id !== null && product.id !== "";
  const path = isEdit ? `/api/atendente/cardapio/${encodeURIComponent(String(product.id))}` : "/api/atendente/cardapio";
  return request<{ success: boolean; message?: string }>(
    path,
    { method: isEdit ? "PUT" : "POST", body: JSON.stringify(product) },
    token
  );
}

export async function deleteMenuProduct(token: string, productId: string | number) {
  return request<{ success: boolean; message?: string }>(
    `/api/atendente/cardapio/${encodeURIComponent(String(productId))}`,
    { method: "DELETE" },
    token
  );
}

export async function createOrder(token: string, pedido: OrderDetails) {
  const data = await request<{ success: boolean } & CreatedOrder>(
    "/api/atendente/pedidos",
    { method: "POST", body: JSON.stringify(pedido) },
    token
  );
  return data;
}

export async function sendParserFeedback(token: string, associacoes: ParserLearningAssociation[]) {
  if (!associacoes.length) return { success: true, accepted: 0, activated: 0 };
  return request<{ success: boolean; accepted: number; activated: number }>(
    "/api/atendente/parser/feedback",
    { method: "POST", body: JSON.stringify({ associacoes }) },
    token
  );
}

export async function sendParserUsage(
  token: string,
  usos: ParserLearningUse[],
  produtosFinais: string[]
) {
  if (!usos.length) return { success: true, registered: 0 };
  return request<{ success: boolean; registered: number }>(
    "/api/atendente/parser/usage",
    { method: "POST", body: JSON.stringify({ usos, produtosFinais }) },
    token
  );
}

export async function sendParserObservation(token: string, observation: ParserObservation) {
  return request<{ success: boolean; registered: boolean; corrected: boolean }>(
    "/api/atendente/parser/observation",
    { method: "POST", body: JSON.stringify(observation) },
    token
  );
}

export async function validateOrder(token: string, pedido: Pick<OrderDetails, "tipoEntrega" | "itens" | "complementosPedido">) {
  return request<{ success: boolean } & OrderQuote>(
    "/api/atendente/pedidos/validar",
    { method: "POST", body: JSON.stringify(pedido) },
    token
  );
}

export async function searchContacts(
  token: string,
  query: { finalTelefone?: string; nome?: string; telefone?: string }
) {
  const params = new URLSearchParams();
  if (query.finalTelefone) params.set("final", query.finalTelefone);
  if (query.nome) params.set("nome", query.nome);
  if (query.telefone) params.set("telefone", query.telefone);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
  const data = await request<{ success: boolean; contatos: ContactMatch[] }>(
    `/api/atendente/contatos?${params.toString()}`,
    { signal: controller.signal },
    token
  );
  return Array.isArray(data.contatos) ? data.contatos : [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadCustomerHistory(token: string, telefone: string) {
  const params = new URLSearchParams({ telefone });
  const data = await request<{ success: boolean } & CustomerHistory>(
    `/api/atendente/clientes/historico?${params.toString()}`,
    {},
    token
  );
  return {
    resumo: data.resumo || null,
    pedidos: (Array.isArray(data.pedidos) ? data.pedidos : []).map((order) => ({
      ...order,
      carrinho: Array.isArray(order?.carrinho) ? order.carrinho : [],
    })),
  };
}

export async function loadCustomerAiInsight(token: string, telefone: string) {
  const params = new URLSearchParams({ telefone });
  const data = await request<{ success: boolean; ia: CustomerAiInsight }>(
    `/api/atendente/clientes/insight-ia?${params.toString()}`,
    {},
    token
  );
  return data.ia;
}

export async function retryOrderNotification(token: string, pedidoId: number) {
  return request<{ success: boolean; mensagem: { enviada: boolean; motivo: string } }>(
    `/api/atendente/pedidos/${pedidoId}/notificacao`,
    { method: "POST" },
    token
  );
}
