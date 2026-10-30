import type { OrderAdditional } from "../types";

export type ItemChangeLines = {
  removidos: string[];
  adicionais: string[];
  obs: string;
  linhas: string[];
};

export type ItemCutOption = "" | "Partir ao meio";

function normalize(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u2013\u2014-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripRemovalPrefix(value: string) {
  return normalize(value).replace(/^(sem|tirar|retirar|remove|remover|nao colocar|nao poe)\s+/, "").trim();
}

function stripAdditionalPrefix(value: string) {
  return normalize(value).replace(/^(mais|com|adicional de|adicional|adicionar|acrescentar|colocar)\s+/, "").trim();
}

function titleCaseAfterPrefix(prefix: string, value: string) {
  const clean = String(value || "")
    .trim()
    .replace(/[\u2013\u2014-]/g, " ")
    .replace(/\s+/g, " ");
  if (!clean) return "";
  return `${prefix} ${clean.charAt(0).toLowerCase()}${clean.slice(1)}`;
}

function splitObsParts(obs: string) {
  return String(obs || "")
    .split(/\s*(?:,|;|\||\be\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isCutObservation(value: string) {
  const text = normalize(value);
  return text === "partir ao meio" || text === "cortar em 2" || text === "cortar em 4" || text === "cortar partir conforme solicitado";
}

export function getItemCutOption(obs: string): ItemCutOption {
  const parts = splitObsParts(obs);
  if (parts.some((part) => ["partir ao meio", "cortar em 2"].includes(normalize(part)))) return "Partir ao meio";
  return "";
}

export function setItemCutOption(obs: string, option: ItemCutOption) {
  const freeParts = splitObsParts(obs).filter((part) => !isCutObservation(part));
  return [...freeParts, ...(option ? [option] : [])].join("; ");
}

export function formatItemChanges(item: {
  qtd?: number;
  removidos?: unknown[];
  adicionais?: OrderAdditional[];
  obs?: string;
}): ItemChangeLines {
  const removidos = Array.from(new Set(
    (Array.isArray(item.removidos) ? item.removidos : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  ));
  const adicionais = Array.isArray(item.adicionais) ? item.adicionais.filter((value) => value?.nome) : [];
  const removedKeys = new Set(removidos.map(stripRemovalPrefix));
  const additionalKeys = new Set(adicionais.map((add) => normalize(add.nome)));
  const obsParts = splitObsParts(String(item.obs || ""));
  const obsLivre = obsParts.filter((part) => {
    const removalKey = stripRemovalPrefix(part);
    if (removedKeys.has(removalKey)) return false;
    const additionalKey = stripAdditionalPrefix(part);
    if (additionalKeys.has(additionalKey)) return false;
    return true;
  });

  const linhasRemovidos = removidos.map((name) => titleCaseAfterPrefix("Sem", name));
  const linhasAdicionais = adicionais.map((add) => {
    const qtd = Math.max(Number(add.qtd || 1), 1);
    const quantidadeItem = Math.max(Number(item.qtd || 1), 1);
    const total = qtd * (add.escopo === "total" ? 1 : quantidadeItem);
    if (quantidadeItem > 1 && add.escopo !== "total") {
      return `Adicional: ${add.nome} x${qtd} por lanche (${total} no total)`;
    }
    if (add.escopo === "total" && total > 1) return `Adicional: ${add.nome} x${total} no total`;
    return `Adicional: ${add.nome}${qtd > 1 ? ` x${qtd}` : ""}`;
  });
  const obs = obsLivre.join("; ");
  return {
    removidos: linhasRemovidos,
    adicionais: linhasAdicionais,
    obs,
    linhas: [...linhasRemovidos, ...linhasAdicionais, ...(obs ? [`Obs: ${obs}`] : [])],
  };
}
