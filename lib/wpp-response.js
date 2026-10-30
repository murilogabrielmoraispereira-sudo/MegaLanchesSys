function textoStatus(valor) {
  return String(valor || "").trim().toLowerCase();
}

function respostaLista(data) {
  const response = data?.response ?? data?.data?.response;
  if (Array.isArray(response)) return response;
  return response ? [response] : [];
}

export function avaliarRespostaEnvioWpp(data) {
  const respostas = respostaLista(data);
  const falhas = respostas.filter((item) =>
    item?.isSendFailure === true ||
    item?.success === false ||
    item?.ok === false ||
    ["error", "failed", "failure"].includes(textoStatus(item?.status))
  );
  const status = textoStatus(data?.status ?? data?.data?.status);
  const erroSuperior = data?.error ?? data?.data?.error;
  const possuiErroSuperior =
    erroSuperior === true ||
    (typeof erroSuperior === "string" && Boolean(erroSuperior.trim())) ||
    (erroSuperior && typeof erroSuperior === "object" && Object.keys(erroSuperior).length > 0);
  const falhaSuperior =
    data?.success === false ||
    data?.ok === false ||
    ["error", "failed", "failure"].includes(status) ||
    status.startsWith("error") ||
    status.startsWith("fail");
  if (falhas.length || falhaSuperior || possuiErroSuperior) {
    return {
      ok: false,
      error: falhas.length ? "send_failure" : "wpp_response_error",
      body: data,
      failedTo: falhas.map((item) => item?.to || item?.chatId || "").filter(Boolean),
    };
  }

  return { ok: true, body: data };
}
