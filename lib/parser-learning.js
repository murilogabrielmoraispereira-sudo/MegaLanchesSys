const MIN_CONFIRMATIONS = 3;
const MIN_EVALUATED_USES = 5;
const MIN_ACCURACY = 0.65;
const MIN_LEAD = 2;

export function chooseActiveAliasCandidate(rows = []) {
  const ranked = rows
    .map((row) => {
      const confirmations = Math.max(Number(row.confirmacoes) || 0, 0);
      const uses = Math.max(Number(row.usos) || 0, 0);
      const hits = Math.max(Number(row.acertos) || 0, 0);
      const errors = Math.max(Number(row.erros) || 0, 0);
      const accuracy = uses > 0 ? hits / uses : null;
      return { ...row, confirmations, uses, hits, errors, accuracy };
    })
    .sort((a, b) =>
      b.confirmations - a.confirmations ||
      b.hits - a.hits ||
      a.errors - b.errors ||
      String(a.produto_id).localeCompare(String(b.produto_id))
    );

  const leader = ranked[0];
  if (!leader || leader.confirmations < MIN_CONFIRMATIONS) {
    return { productId: "", reason: "insufficient_confirmations" };
  }
  if (leader.uses >= MIN_EVALUATED_USES && Number(leader.accuracy) < MIN_ACCURACY) {
    return { productId: "", reason: "low_accuracy" };
  }
  const runnerUp = ranked[1];
  if (runnerUp && leader.confirmations - runnerUp.confirmations < MIN_LEAD) {
    return { productId: "", reason: "conflicting_products" };
  }
  return { productId: String(leader.produto_id), reason: "trusted" };
}

function normalizeSafeItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .slice(0, 80)
    .map((item) => ({
      produtoId: String(item?.produtoId || "").trim().slice(0, 80),
      qtd: Math.min(Math.max(Number(item?.qtd) || 0, 0), 99),
      removidos: (Array.isArray(item?.removidos) ? item.removidos : [])
        .slice(0, 20)
        .map((value) => String(value || "").trim().slice(0, 60))
        .filter(Boolean)
        .sort(),
      adicionais: (Array.isArray(item?.adicionais) ? item.adicionais : [])
        .slice(0, 20)
        .map((addition) => ({
          nome: String(addition?.nome || "").trim().slice(0, 60),
          qtd: Math.min(Math.max(Number(addition?.qtd) || 0, 0), 20),
        }))
        .filter((addition) => addition.nome && addition.qtd > 0)
        .sort((a, b) => a.nome.localeCompare(b.nome)),
      obs: String(item?.obs || "").trim().slice(0, 300),
    }))
    .filter((item) => item.produtoId && item.qtd > 0)
    .sort((a, b) => a.produtoId.localeCompare(b.produtoId));
}

export function summarizeParserObservation(input = {}) {
  const initialItems = normalizeSafeItems(input.initialItems);
  const finalItems = normalizeSafeItems(input.finalItems);
  const initialJson = JSON.stringify(initialItems);
  const finalJson = JSON.stringify(finalItems);
  const initialUnits = initialItems.reduce((sum, item) => sum + item.qtd, 0);
  const finalUnits = finalItems.reduce((sum, item) => sum + item.qtd, 0);
  const initialModifiers = initialItems.reduce(
    (sum, item) => sum + item.removidos.length + item.adicionais.length + (item.obs ? 1 : 0),
    0
  );
  const finalModifiers = finalItems.reduce(
    (sum, item) => sum + item.removidos.length + item.adicionais.length + (item.obs ? 1 : 0),
    0
  );
  const ambiguities = Math.min(Math.max(Number(input.ambiguities) || 0, 0), 50);
  const unknown = Math.min(Math.max(Number(input.unknown) || 0, 0), 50);
  const warnings = Math.min(Math.max(Number(input.warnings) || 0, 0), 50);
  return {
    initialItems,
    finalItems,
    initialJson,
    finalJson,
    initialUnits,
    finalUnits,
    initialModifiers,
    finalModifiers,
    ambiguities,
    unknown,
    warnings,
    changed: initialJson !== finalJson,
  };
}

export const PARSER_LEARNING_POLICY = Object.freeze({
  minConfirmations: MIN_CONFIRMATIONS,
  minEvaluatedUses: MIN_EVALUATED_USES,
  minAccuracy: MIN_ACCURACY,
  minLead: MIN_LEAD,
});
