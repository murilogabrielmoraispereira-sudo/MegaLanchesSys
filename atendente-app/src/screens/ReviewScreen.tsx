import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors, commonStyles } from "../styles/theme";
import type {
  Catalog,
  CatalogProduct,
  ContactMatch,
  CustomerAiInsight,
  CustomerHistory,
  InterpretationAmbiguity,
  OrderDetails,
  OrderItem,
  OrderQuote,
  ParserLearningAssociation,
  ParserLearningUse,
  ParserObservation,
  ParserRecognition,
} from "../types";
import { resolveContactMatches } from "../utils/contactResolution";
import { formatItemChanges, getItemCutOption, setItemCutOption, type ItemCutOption } from "../utils/itemChanges";
import { calculateLocalOrderSubtotal, localItemUnitPrice } from "../utils/orderPricing";
import { deriveReplacementLearning, normalizeParserLearningTerm } from "../utils/parserLearning";

type Props = {
  initialDraft: OrderDetails;
  catalog: Catalog;
  initialAmbiguities: InterpretationAmbiguity[];
  initialUnknown: string[];
  initialWarnings: string[];
  initialLearningUses?: ParserLearningUse[];
  initialRecognitions?: ParserRecognition[];
  onSearchContacts: (query: { finalTelefone?: string; nome?: string; telefone?: string }) => Promise<ContactMatch[]>;
  onLoadCustomerHistory: (telefone: string) => Promise<CustomerHistory>;
  onLoadCustomerAiInsight: (telefone: string) => Promise<CustomerAiInsight>;
  onValidateOrder: (pedido: Pick<OrderDetails, "tipoEntrega" | "itens" | "complementosPedido">) => Promise<OrderQuote>;
  onBack: () => void;
  onSubmit: (draft: OrderDetails, learning: ParserLearningAssociation[], uses: ParserLearningUse[], observation: ParserObservation) => Promise<void>;
};

function money(value: number) {
  return `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;
}

function isOrderComplement(name: string) {
  return /\b(maionese|ketchup)\b/.test(
    String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  );
}

function newItem(product: CatalogProduct): OrderItem {
  return {
    produtoId: String(product.id),
    nome: product.nome,
    preco: Number(product.preco) || 0,
    qtd: 1,
    adicionais: [],
    removidos: [],
    obs: "",
    tipo: product.tipo || "item",
    categoria: product.categoria || "",
  };
}

function normalizeDraft(draft: OrderDetails): OrderDetails {
  return {
    ...draft,
    itens: (Array.isArray(draft?.itens) ? draft.itens : []).map((item) => ({
      ...item,
      adicionais: Array.isArray(item?.adicionais) ? item.adicionais : [],
      removidos: Array.isArray(item?.removidos) ? item.removidos : [],
      obs: String(item?.obs || ""),
    })),
    complementosPedido: Array.isArray(draft?.complementosPedido) ? draft.complementosPedido : [],
  };
}

function Choice({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primarySoft : colors.surface,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 9,
      }}
    >
      <Text style={{ color: active ? colors.primary : colors.text, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

export function ReviewScreen({
  initialDraft,
  catalog,
  initialAmbiguities,
  initialUnknown,
  initialWarnings,
  initialLearningUses,
  initialRecognitions,
  onSearchContacts,
  onLoadCustomerHistory,
  onLoadCustomerAiInsight,
  onValidateOrder,
  onBack,
  onSubmit,
}: Props) {
  const [draft, setDraft] = useState(() => normalizeDraft(initialDraft));
  const [ambiguities, setAmbiguities] = useState(Array.isArray(initialAmbiguities) ? initialAmbiguities : []);
  const [unknown, setUnknown] = useState(Array.isArray(initialUnknown) ? initialUnknown : []);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [contacts, setContacts] = useState<ContactMatch[]>([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [customerHistory, setCustomerHistory] = useState<CustomerHistory | null>(null);
  const [customerHistoryLoading, setCustomerHistoryLoading] = useState(false);
  const [customerAi, setCustomerAi] = useState<CustomerAiInsight | null>(null);
  const [customerAiLoading, setCustomerAiLoading] = useState(false);
  const customerAiRequestPhone = useRef("");
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [validatedQuoteKey, setValidatedQuoteKey] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [learning, setLearning] = useState<ParserLearningAssociation[]>([]);

  const recordLearning = (term: string, product: CatalogProduct) => {
    const normalized = normalizeParserLearningTerm(term);
    if (!normalized) return;
    setLearning((current) => {
      const next = current.filter((item) => !(item.termo.toLowerCase() === normalized && item.produtoId === String(product.id)));
      return [...next, { termo: String(term).trim(), produtoId: String(product.id), produtoNome: product.nome }];
    });
  };

  const searchContacts = async () => {
    const finalTelefone = String(draft.telefoneFinal || "").trim();
    const nome = String(draft.cliente || "").trim();
    const telefone = String(draft.telefone || "").trim();
    if (draft.tipoEntrega === "Na porta") return;
    if (!/^\d{4}$/.test(finalTelefone) && !nome && !telefone) return;
    setContactLoading(true);
    setContactMessage("");
    try {
      const found = await onSearchContacts({ finalTelefone, nome, telefone });
      setContacts(found);
      const resolution = resolveContactMatches(found);
      if (resolution.selected) {
        const contact = resolution.selected;
        await selectContact(contact);
        setContactMessage("Um contato foi encontrado e selecionado. Confira abaixo.");
      } else if (resolution.requiresSelection) {
        setContactMessage(`Foram encontrados ${found.length} contatos possiveis. Escolha o correto.`);
      } else {
        setContactMessage(telefone
          ? "Telefone informado. Nao achei conversa salva, mas voce pode criar o pedido mesmo assim."
          : "Nenhum contato encontrado. Digite o telefone completo ou envie sem mensagem automatica.");
      }
    } catch (err) {
      setContactMessage(err instanceof Error && err.name === "AbortError"
        ? "Busca expirou. Tente novamente ou crie sem mensagem automatica."
        : err instanceof Error ? err.message : "Nao foi possivel pesquisar os contatos.");
    } finally {
      setContactLoading(false);
    }
  };

  const selectContact = async (contact: ContactMatch) => {
    setDraft((current) => ({
      ...current,
      telefone: contact.telefone,
      cliente: current.cliente || contact.nome || "",
    }));
    setCustomerHistory(null);
    setCustomerAi(null);
    setCustomerHistoryLoading(true);
    setCustomerAiLoading(true);
    const selectedPhone = contact.telefone;
    customerAiRequestPhone.current = selectedPhone;
    void onLoadCustomerAiInsight(selectedPhone)
      .then((result) => {
        if (customerAiRequestPhone.current === selectedPhone) setCustomerAi(result);
      })
      .catch(() => {
        if (customerAiRequestPhone.current === selectedPhone) setCustomerAi({ status: "error" });
      })
      .finally(() => {
        if (customerAiRequestPhone.current === selectedPhone) setCustomerAiLoading(false);
      });
    try {
      setCustomerHistory(await onLoadCustomerHistory(contact.telefone));
    } catch {
      setContactMessage("Contato selecionado, mas nao foi possivel carregar o historico agora.");
    } finally {
      setCustomerHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (draft.tipoEntrega !== "Na porta" && (draft.telefoneFinal || draft.cliente || draft.telefone)) searchContacts();
  }, []);

  const quoteKey = JSON.stringify({
    tipoEntrega: draft.tipoEntrega,
    itens: draft.itens,
    complementosPedido: draft.complementosPedido,
  });
  useEffect(() => {
    if (!draft.itens.length) {
      setQuote(null);
      setValidatedQuoteKey("");
      return;
    }
    let active = true;
    setQuote(null);
    setValidatedQuoteKey("");
    setQuoteLoading(true);
    setQuoteError("");
    onValidateOrder({
      tipoEntrega: draft.tipoEntrega,
      itens: draft.itens,
      complementosPedido: draft.complementosPedido,
    })
      .then((result) => {
        if (active) {
          setQuote(result);
          setValidatedQuoteKey(quoteKey);
        }
      })
      .catch((err) => {
        if (!active) return;
        setQuote(null);
        setQuoteError(err instanceof Error ? err.message : "Nao foi possivel validar os valores.");
      })
      .finally(() => {
        if (active) setQuoteLoading(false);
      });
    return () => { active = false; };
  }, [quoteKey]);

  const products = (Array.isArray(catalog.cardapio) ? catalog.cardapio : []).filter((item) => item.disponivel !== false);
  const catalogAdditionals = Array.isArray(catalog.adicionais) ? catalog.adicionais : [];
  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return products.filter((item) => item.nome.toLowerCase().includes(term)).slice(0, 8);
  }, [products, search]);
  const automaticLearning = useMemo(() => deriveReplacementLearning(
    initialDraft.itens,
    draft.itens,
    Array.isArray(initialRecognitions) ? initialRecognitions : [],
    products
  ), [draft.itens, initialDraft.itens, initialRecognitions, products]);
  const learningPreview = [...learning, ...automaticLearning].filter((item, index, all) =>
    all.findIndex((candidate) => candidate.termo === item.termo && candidate.produtoId === item.produtoId) === index
  );

  const updateItem = (index: number, next: OrderItem) => {
    setDraft((current) => ({
      ...current,
      itens: current.itens.map((item, itemIndex) => itemIndex === index ? next : item),
    }));
  };

  const removeItem = (index: number) => {
    setDraft((current) => ({ ...current, itens: current.itens.filter((_, itemIndex) => itemIndex !== index) }));
  };

  const addProduct = (product: CatalogProduct, resolveUnknown = true) => {
    setDraft((current) => ({ ...current, itens: [...current.itens, newItem(product)] }));
    const unresolved = resolveUnknown ? unknown[0] : "";
    if (unresolved) {
      recordLearning(unresolved, product);
      setUnknown((current) => current.slice(1));
    }
    setSearch("");
  };

  const updateComplement = (index: number, qtd: number) => {
    setDraft((current) => ({
      ...current,
      complementosPedido: current.complementosPedido
        .map((item, itemIndex) => itemIndex === index ? { ...item, qtd: Math.max(0, qtd) } : item)
        .filter((item) => item.qtd > 0),
    }));
  };

  const removeComplement = (index: number) => {
    setDraft((current) => ({
      ...current,
      complementosPedido: current.complementosPedido.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const resolveAmbiguity = (ambiguity: InterpretationAmbiguity, product: CatalogProduct) => {
    addProduct(product, false);
    recordLearning(ambiguity.trecho, product);
    setAmbiguities((current) => current.filter((item) => item !== ambiguity));
  };

  const copyChangesToAll = (index: number) => {
    const source = draft.itens[index];
    setDraft((current) => ({
      ...current,
      itens: current.itens.map((item) => item.produtoId === source.produtoId
        ? { ...item, removidos: [...source.removidos], adicionais: source.adicionais.map((add) => ({ ...add })), obs: source.obs }
        : item),
    }));
  };

  const copyChangesToNext = (index: number) => {
    const source = draft.itens[index];
    const nextIndex = draft.itens.findIndex((item, itemIndex) => itemIndex > index && item.produtoId === source.produtoId);
    if (nextIndex < 0) return;
    updateItem(nextIndex, {
      ...draft.itens[nextIndex],
      removidos: [...source.removidos],
      adicionais: source.adicionais.map((add) => ({ ...add })),
      obs: source.obs,
    });
  };

  const mergeIdenticalItems = () => {
    setDraft((current) => {
      const merged = new Map<string, OrderItem>();
      current.itens.forEach((item) => {
        const key = JSON.stringify({
          produtoId: item.produtoId,
          removidos: [...item.removidos].sort(),
          adicionais: item.adicionais.map((add) => ({ nome: add.nome, qtd: add.qtd, escopo: add.escopo })).sort((a, b) => a.nome.localeCompare(b.nome)),
          obs: item.obs,
        });
        const existing = merged.get(key);
        if (existing) {
          existing.qtd += item.qtd;
          existing.adicionais = existing.adicionais.map((add, index) => add.escopo === "total"
            ? { ...add, qtd: add.qtd + (item.adicionais.find((value) => value.nome === add.nome && value.escopo === add.escopo)?.qtd || 0) }
            : add);
        }
        else merged.set(key, { ...item, adicionais: item.adicionais.map((add) => ({ ...add })), removidos: [...item.removidos] });
      });
      return { ...current, itens: Array.from(merged.values()) };
    });
  };

  const localSubtotal = calculateLocalOrderSubtotal(draft.itens, draft.complementosPedido, catalog);
  const subtotal = quote?.subtotal ?? localSubtotal;
  const deliveryFee = quote?.taxaEntrega ?? (draft.tipoEntrega === "Entrega" ? catalog.taxaEntrega : 0);
  const total = quote?.total ?? (subtotal + deliveryFee);
  const categoryTotals = draft.itens.reduce<Record<string, number>>((totals, item) => {
    const category = String(item.categoria || "sem categoria").trim().toLowerCase();
    totals[category] = (totals[category] || 0) + item.qtd;
    return totals;
  }, {});
  const totalUnits = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0);

  const submit = async () => {
    if (!draft.itens.length) return setError("Adicione pelo menos um produto.");
    if (draft.tipoEntrega === "Entrega" && !draft.endereco.trim()) return setError("Informe o endereco da entrega.");
    if (contactLoading) return setError("Aguarde a pesquisa do contato terminar.");
    if (quoteLoading) return setError("Aguarde a validacao dos valores terminar.");
    if (quoteError || !quote || validatedQuoteKey !== quoteKey) {
      return setError("Corrija o pedido antes de enviar: os valores ainda nao foram validados.");
    }
    if (draft.tipoEntrega !== "Na porta" && draft.telefoneFinal && contacts.length > 1 && !draft.telefone.trim()) {
      return setError("Escolha qual contato fez o pedido ou informe o telefone completo.");
    }
    if (ambiguities.length || unknown.length) return setError("Resolva ou ignore todos os trechos pendentes.");
    setSending(true);
    setError("");
    try {
      await onSubmit(
        draft,
        learningPreview,
        Array.isArray(initialLearningUses) ? initialLearningUses : [],
        {
          requestId: draft.requestId,
          initialItems: initialDraft.itens,
          finalItems: draft.itens,
          ambiguities: initialAmbiguities.length,
          unknown: initialUnknown.length,
          warnings: initialWarnings.length,
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={commonStyles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Conferir pedido" subtitle="Nada sera enviado antes da sua confirmacao." />
      <View style={{ flexDirection: "row", gap: 6 }}>
        {["Interpretado", "Conferencia", "Enviar"].map((step, index) => (
          <View key={step} style={{ flex: 1, gap: 5 }}>
            <View style={{ height: 4, borderRadius: 999, backgroundColor: index < 2 ? colors.primary : colors.border }} />
            <Text style={{ color: index === 1 ? colors.primary : colors.muted, fontSize: 10, fontWeight: "800", textAlign: "center" }}>{step}</Text>
          </View>
        ))}
      </View>

      {(Array.isArray(initialWarnings) ? initialWarnings : []).map((warning) => (
        <View key={warning} style={[commonStyles.card, { borderColor: colors.accent }]}>
          <Text style={{ color: colors.danger, fontWeight: "700" }}>{warning}</Text>
        </View>
      ))}

      {draft.tipoEntrega !== "Na porta" && (!!draft.telefoneFinal || !!draft.cliente || !!draft.telefone) && (
        <View style={[commonStyles.card, { borderColor: colors.accent }]}>
          <Text style={commonStyles.label}>
            Resolver contato {draft.telefoneFinal ? `final ${draft.telefoneFinal}` : draft.telefone ? draft.telefone : draft.cliente}
          </Text>
          {!!contactMessage && <Text style={commonStyles.subtitle}>{contactMessage}</Text>}
          {contacts.map((contact) => {
            const selected = draft.telefone === contact.telefone;
            return (
              <Pressable
                key={contact.telefone}
                onPress={() => selectContact(contact)}
                style={[commonStyles.card, { borderColor: selected ? colors.primary : colors.border, padding: 12 }]}
              >
                <Text style={commonStyles.label}>{contact.nome || "Contato sem nome"} · {contact.telefoneOculto}</Text>
                {!!contact.atualizadoEm && <Text style={commonStyles.subtitle}>{new Date(contact.atualizadoEm).toLocaleString("pt-BR")}</Text>}
                <Text style={commonStyles.subtitle}>
                  {contact.pedidosCount
                    ? `${contact.segmento === "vip" ? "VIP" : contact.segmento === "recorrente" ? "Recorrente" : contact.segmento === "sumido" ? "Sumido" : "Cliente"} · ${contact.pedidosCount} pedido(s) · ${money(contact.totalGasto || 0)}`
                    : "Cliente sem pedidos anteriores"}
                </Text>
                {!!contact.produtoFavorito && <Text style={commonStyles.subtitle}>Favorito: {contact.produtoFavorito}</Text>}
                {!!contact.ultimoPedido && <Text style={commonStyles.subtitle}>Ultimo pedido: {new Date(contact.ultimoPedido).toLocaleString("pt-BR")}</Text>}
                {!!contact.ultimaMensagem && <Text style={commonStyles.subtitle}>{contact.ultimaMensagem}</Text>}
                {selected && customerHistoryLoading && <Text style={commonStyles.subtitle}>Carregando historico...</Text>}
                {selected && customerAiLoading && <Text style={commonStyles.subtitle}>A IA esta analisando o cliente...</Text>}
                {selected && customerAi?.status === "ready" && !!customerAi.insight && (
                  <View style={{ marginTop: 9, padding: 10, borderRadius: 10, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary }}>
                    <Text style={{ color: colors.primary, fontWeight: "900" }}>Analise da IA / perfil {customerAi.insight.perfil}</Text>
                    <Text style={commonStyles.subtitle}>{customerAi.insight.resumo}</Text>
                    {!!customerAi.insight.produtosProvaveis.length && (
                      <View style={{ gap: 3 }}>
                        <Text style={commonStyles.subtitle}>Produtos provaveis:</Text>
                        {customerAi.insight.produtosProvaveis.map((item) => (
                          <Text key={item.produtoId} style={commonStyles.subtitle}>• {item.produtoNome} ({item.confianca}%): {item.motivo}</Text>
                        ))}
                      </View>
                    )}
                    {!!customerAi.insight.mudancaHabito?.changed && (
                      <Text style={[commonStyles.subtitle, { color: colors.accent, fontWeight: "800" }]}>{customerAi.insight.mudancaHabito.message}</Text>
                    )}
                    {!!customerAi.insight.preferenciasConfirmar.length && (
                      <Text style={commonStyles.subtitle}>Confirmar: {customerAi.insight.preferenciasConfirmar.join(", ")}</Text>
                    )}
                    {!!customerAi.insight.sugestoesAtendimento.length && (
                      <Text style={commonStyles.subtitle}>Atendimento: {customerAi.insight.sugestoesAtendimento.join("; ")}</Text>
                    )}
                    {!!customerAi.insight.alertas.length && (
                      <Text style={commonStyles.subtitle}>Cuidados: {customerAi.insight.alertas.join("; ")}</Text>
                    )}
                    {customerAi.insight.oportunidadeMarketing.acao !== "nenhuma" && (
                      <Text style={commonStyles.subtitle}>Marketing sugerido: {customerAi.insight.oportunidadeMarketing.justificativa}</Text>
                    )}
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700", marginTop: 4 }}>Sugestao da IA: confirme tudo com o cliente.</Text>
                  </View>
                )}
                {selected && customerAi?.status === "unconfigured" && (
                  <Text style={commonStyles.subtitle}>IA preparada, mas a chave da API ainda nao foi configurada no servidor.</Text>
                )}
                {selected && customerAi?.status === "error" && (
                  <Text style={commonStyles.subtitle}>A IA nao respondeu agora. O historico abaixo continua disponivel.</Text>
                )}
                {selected && !!customerHistory?.resumo?.aprendizado && (
                  <View style={{ marginTop: 9, padding: 10, borderRadius: 10, backgroundColor: colors.successSoft }}>
                    <Text style={{ color: colors.success, fontWeight: "900" }}>Padroes do historico</Text>
                    <Text style={commonStyles.subtitle}>
                      Sugestoes baseadas em {customerHistory.resumo.aprendizado.pedidosAnalisados} pedido(s). Confirme antes de aplicar.
                    </Text>
                    {!!customerHistory.resumo.aprendizado.produtosFavoritos.length && (
                      <Text style={commonStyles.subtitle}>
                        Mais pedidos: {customerHistory.resumo.aprendizado.produtosFavoritos.map((item) => `${item.nome} (${item.qtd}x)`).join(", ")}
                      </Text>
                    )}
                    {!!customerHistory.resumo.aprendizado.preferenciasRecorrentes.length && (
                      <Text style={commonStyles.subtitle}>
                        Preferencias: {customerHistory.resumo.aprendizado.preferenciasRecorrentes.map((item) => `${item.tipo === "remover" ? "sem" : "+"} ${item.nome} (${item.ocorrencias} pedidos, ${item.confianca}%)`).join(", ")}
                      </Text>
                    )}
                    {!!customerHistory.resumo.aprendizado.tipoEntregaFavorito && (
                      <Text style={commonStyles.subtitle}>Mais comum: {customerHistory.resumo.aprendizado.tipoEntregaFavorito} / {customerHistory.resumo.aprendizado.formaPagamentoFavorita || "pagamento nao identificado"}</Text>
                    )}
                  </View>
                )}
                {selected && (Array.isArray(customerHistory?.pedidos) ? customerHistory.pedidos : []).slice(0, 5).map((pedido) => (
                  <View key={pedido.id} style={{ marginTop: 7, paddingTop: 7, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={commonStyles.subtitle}>
                      #{pedido.id} · {pedido.created_at ? new Date(pedido.created_at).toLocaleDateString("pt-BR") : ""} · {pedido.status}
                    </Text>
                    <Text style={commonStyles.subtitle}>
                      {(Array.isArray(pedido.carrinho) ? pedido.carrinho : []).slice(0, 3).map((item) => `${item.qtd}x ${item.nome}`).join(", ")}
                    </Text>
                  </View>
                ))}
                {selected && <Text style={{ color: colors.success, fontWeight: "700" }}>Selecionado</Text>}
              </Pressable>
            );
          })}
          <PrimaryButton title="Pesquisar novamente" secondary loading={contactLoading} onPress={searchContacts} />
        </View>
      )}

      {ambiguities.map((ambiguity) => (
        <View key={ambiguity.trecho} style={[commonStyles.card, { borderColor: colors.accent }]}>
          <Text style={commonStyles.label}>Nao foi possivel identificar: “{ambiguity.trecho}”</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ambiguity.sugestoes.map((product) => (
              <Choice key={String(product.id)} active={false} label={product.nome} onPress={() => resolveAmbiguity(ambiguity, product)} />
            ))}
          </View>
        </View>
      ))}

      {unknown.map((chunk) => (
        <View key={chunk} style={[commonStyles.card, { borderColor: colors.accent }]}>
          <Text style={commonStyles.label}>Produto nao identificado: “{chunk}”</Text>
          <Text style={commonStyles.subtitle}>Adicione o produto pela busca abaixo ou confirme que esse trecho pode ser ignorado.</Text>
          <PrimaryButton title="Ignorar este trecho" secondary onPress={() => setUnknown((items) => items.filter((item) => item !== chunk))} />
        </View>
      ))}

      {!!learningPreview.length && (
        <View style={[commonStyles.card, { borderColor: colors.success, backgroundColor: colors.successSoft }]}>
          <Text style={{ color: colors.success, fontWeight: "900" }}>Aprendizado preparado</Text>
          {learningPreview.map((item) => (
            <Text key={`${item.termo}-${item.produtoId}`} style={commonStyles.subtitle}>
              "{item.termo}" sera associado a {item.produtoNome} quando o pedido for criado.
            </Text>
          ))}
          <Text style={commonStyles.subtitle}>O sistema ativa o apelido automaticamente depois de 3 confirmacoes consistentes.</Text>
        </View>
      )}

      <View style={commonStyles.card}>
        <Text style={commonStyles.label}>Adicionar produto</Text>
        <TextInput value={search} onChangeText={setSearch} placeholder="Pesquisar no cardapio" style={commonStyles.input} />
        {searchResults.map((product) => (
          <Pressable key={String(product.id)} onPress={() => addProduct(product)} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.text, fontWeight: "700" }}>{product.nome} · {money(product.preco)}</Text>
          </Pressable>
        ))}
      </View>

      {draft.itens.map((item, index) => {
        const product = products.find((entry) => String(entry.id) === item.produtoId);
        const ingredients = Array.isArray(product?.ingredientes) ? product.ingredientes : [];
        const validatedItem = quote?.itens[index];
        const sameProductIndexes = draft.itens
          .map((entry, itemIndex) => entry.produtoId === item.produtoId ? itemIndex : -1)
          .filter((itemIndex) => itemIndex >= 0);
        const unitNumber = sameProductIndexes.indexOf(index) + 1;
        const totalProductUnits = draft.itens
          .filter((entry) => entry.produtoId === item.produtoId)
          .reduce((sum, entry) => sum + entry.qtd, 0);
        const itemTitle = totalProductUnits > 1 && item.qtd === 1
          ? `${validatedItem?.nome || item.nome} - unidade ${unitNumber}`
          : `${validatedItem?.nome || item.nome}${item.qtd > 1 ? ` - ${item.qtd} unidades` : ""}`;
        const cutOption = getItemCutOption(item.obs);
        return (
          <View key={`${item.produtoId}-${index}`} style={commonStyles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <Text style={[commonStyles.label, { flex: 1, fontSize: 17 }]}>{itemTitle}</Text>
              <Pressable onPress={() => removeItem(index)}><Text style={{ color: colors.danger, fontWeight: "700" }}>Remover</Text></Pressable>
            </View>
            <Text style={commonStyles.subtitle}>
              {money(validatedItem?.preco ?? localItemUnitPrice(item, draft.itens, catalog))} cada
            </Text>
            {formatItemChanges(item).linhas.map((line) => (
              <Text key={line} style={commonStyles.subtitle}>{line}</Text>
            ))}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Choice active={false} label="−" onPress={() => updateItem(index, { ...item, qtd: Math.max(1, item.qtd - 1) })} />
              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>{item.qtd}</Text>
              <Choice active={false} label="+" onPress={() => updateItem(index, { ...item, qtd: item.qtd + 1 })} />
            </View>

            {!!ingredients.length && <Text style={commonStyles.label}>Remover ingredientes</Text>}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {ingredients.map((ingredient) => {
                const name = String(ingredient).replace(/^\d+\s+/, "").replace(/\s+x\d+$/i, "").trim();
                const active = item.removidos.some((value) => value.toLowerCase() === name.toLowerCase());
                return (
                  <Choice
                    key={name}
                    active={active}
                    label={`Sem ${name}`}
                    onPress={() => updateItem(index, {
                      ...item,
                      removidos: active
                        ? item.removidos.filter((value) => value.toLowerCase() !== name.toLowerCase())
                        : [...item.removidos, name],
                    })}
                  />
                );
              })}
            </View>

            <Text style={commonStyles.label}>Adicionais</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {catalogAdditionals.filter((additional) => !isOrderComplement(additional.nome)).map((additional) => {
                const selected = item.adicionais.find((value) => value.nome === additional.nome);
                return (
                  <Choice
                    key={additional.nome}
                    active={Boolean(selected)}
                    label={`${additional.nome} (+${money(additional.preco)})${selected ? ` x${selected.qtd}` : ""}`}
                    onPress={() => updateItem(index, {
                      ...item,
                      adicionais: selected
                        ? item.adicionais.filter((value) => value.nome !== additional.nome)
                        : [...item.adicionais, { ...additional, qtd: 1, escopo: "unidade" }],
                    })}
                  />
                );
              })}
            </View>
            {!!item.adicionais.length && (
              <View style={{ gap: 8 }}>
                <Text style={commonStyles.subtitle}>Os adicionais valem por lanche. Se quiser cobrar uma quantidade unica para o grupo, escolha Total.</Text>
                {item.adicionais.map((additional) => (
                  <View
                    key={additional.nome}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}
                  >
                    <Text style={[commonStyles.subtitle, { flex: 1 }]}>{additional.nome} x{additional.qtd * (additional.escopo === "total" ? 1 : item.qtd)} no total</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Choice active={additional.escopo !== "total"} label={additional.escopo === "total" ? "Total" : "Por lanche"}
                        onPress={() => updateItem(index, { ...item, adicionais: item.adicionais.map((value) => value.nome === additional.nome ? { ...value, escopo: value.escopo === "total" ? "unidade" : "total" } : value) })} />
                      <Choice
                        active={false}
                        label="-"
                        onPress={() => updateItem(index, {
                          ...item,
                          adicionais: item.adicionais
                            .map((value) => value.nome === additional.nome ? { ...value, qtd: Math.max(0, value.qtd - 1) } : value)
                            .filter((value) => value.qtd > 0),
                        })}
                      />
                      <Choice
                        active={false}
                        label="+"
                        onPress={() => updateItem(index, {
                          ...item,
                          adicionais: item.adicionais.map((value) => value.nome === additional.nome ? { ...value, qtd: value.qtd + 1 } : value),
                        })}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {totalProductUnits > 1 && (
              <View style={{ gap: 8 }}>
                {item.qtd > 1 && (item.removidos.length > 0 || item.adicionais.length > 0) && (
                  <Text style={commonStyles.subtitle}>Remocoes valem para as {item.qtd} unidades. Confira acima o total de cada adicional.</Text>
                )}
                <PrimaryButton title="Aplicar alteracoes a todas as unidades" secondary onPress={() => copyChangesToAll(index)} />
                {sameProductIndexes.some((itemIndex) => itemIndex > index) && (
                  <PrimaryButton title="Copiar para a proxima unidade" secondary onPress={() => copyChangesToNext(index)} />
                )}
              </View>
            )}

            {!!ingredients.length && (
              <View style={{ gap: 8 }}>
                <Text style={commonStyles.label}>Corte do lanche</Text>
                <Text style={commonStyles.subtitle}>Escolha se este item deve ir inteiro ou cortado.</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {([
                    ["", "Inteiro"],
                    ["Partir ao meio", "Partir ao meio"],
                  ] as Array<[ItemCutOption, string]>).map(([value, label]) => (
                    <Choice
                      key={label}
                      active={cutOption === value}
                      label={label}
                      onPress={() => updateItem(index, { ...item, obs: setItemCutOption(item.obs, value) })}
                    />
                  ))}
                </View>
              </View>
            )}

            <TextInput
              value={item.obs}
              onChangeText={(obs) => updateItem(index, { ...item, obs })}
              placeholder="Observacao deste item"
              style={commonStyles.input}
            />
          </View>
        );
      })}

      {!!catalogAdditionals.some((item) => isOrderComplement(item.nome)) && (
        <View style={commonStyles.card}>
          <Text style={[commonStyles.label, { fontSize: 17 }]}>Complementos do pedido</Text>
          <Text style={commonStyles.subtitle}>Estes itens valem para o pedido inteiro, nao para cada lanche.</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {catalogAdditionals.filter((item) => isOrderComplement(item.nome)).map((additional) => {
              const selected = draft.complementosPedido.find((item) => item.nome === additional.nome);
              return (
                <Choice
                  key={additional.nome}
                  active={Boolean(selected)}
                  label={`${additional.nome} (+${money(additional.preco)})${selected ? ` x${selected.qtd}` : ""}`}
                  onPress={() => setDraft((current) => ({
                    ...current,
                    complementosPedido: selected
                      ? current.complementosPedido.filter((item) => item.nome !== additional.nome)
                      : [...current.complementosPedido, { ...additional, qtd: 1, escopo: "total" }],
                  }))}
                />
              );
            })}
          </View>
          {draft.complementosPedido.map((item, index) => {
            const validated = quote?.complementosPedido?.[index];
            return (
              <View
                key={`${item.nome}-${index}`}
                style={{ borderTopWidth: index ? 1 : 0, borderTopColor: colors.border, paddingTop: index ? 10 : 0, gap: 8 }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                  <Text style={[commonStyles.subtitle, { flex: 1, fontWeight: "800" }]}>
                    {validated?.qtd ?? item.qtd}x {validated?.nome || item.nome} · {money(validated?.preco ?? item.preco)} cada
                  </Text>
                  <Pressable onPress={() => removeComplement(index)}>
                    <Text style={{ color: colors.danger, fontWeight: "700" }}>Remover</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <Choice active={false} label="-" onPress={() => updateComplement(index, item.qtd - 1)} />
                  <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>{item.qtd}</Text>
                  <Choice active={false} label="+" onPress={() => updateComplement(index, item.qtd + 1)} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {draft.itens.length > 1 && (
        <PrimaryButton title="Juntar unidades com alteracoes iguais" secondary onPress={mergeIdenticalItems} />
      )}

      <View style={commonStyles.card}>
        <Text style={commonStyles.label}>Dados do cliente</Text>
        <TextInput value={draft.cliente} onChangeText={(cliente) => setDraft({ ...draft, cliente })} placeholder="Nome (opcional)" style={commonStyles.input} />
        <TextInput value={draft.telefone} onChangeText={(telefone) => setDraft({ ...draft, telefone })} placeholder="Telefone" keyboardType="phone-pad" style={commonStyles.input} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["Entrega", "Retirada", "Na porta"] as const).map((value) => (
            <Choice
              key={value}
              active={draft.tipoEntrega === value}
              label={value}
              onPress={() => setDraft({
                ...draft,
                tipoEntrega: value,
                endereco: value === "Na porta" ? "" : draft.endereco,
                telefoneFinal: value === "Na porta" ? "" : draft.telefoneFinal,
                telefone: value === "Na porta" ? "" : draft.telefone,
              })}
            />
          ))}
        </View>
        {(draft.tipoEntrega === "Entrega" || Boolean(draft.endereco)) && <TextInput value={draft.endereco} onChangeText={(endereco) => setDraft({ ...draft, endereco })} placeholder="Endereco completo" style={commonStyles.input} />}
        {draft.tipoEntrega === "Na porta" && <Text style={commonStyles.subtitle}>Pedido presencial: sem endereco, telefone, busca de conversa ou mensagem automatica.</Text>}

        <Text style={commonStyles.label}>Pagamento</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(["pix", "dinheiro", "cartao"] as const).map((value) => <Choice key={value} active={draft.pagamento === value} label={value.toUpperCase()} onPress={() => setDraft({ ...draft, pagamento: value, troco: value === "dinheiro" ? draft.troco : "" })} />)}
        </View>
        {draft.pagamento === "dinheiro" && <TextInput value={draft.troco} onChangeText={(troco) => setDraft({ ...draft, troco })} placeholder="Troco para" keyboardType="decimal-pad" style={commonStyles.input} />}
        <TextInput value={draft.obsGeral} onChangeText={(obsGeral) => setDraft({ ...draft, obsGeral })} placeholder="Observacao geral" style={commonStyles.input} />
      </View>

      <View style={commonStyles.card}>
        {Object.entries(categoryTotals).map(([category, quantity]) => (
          <Text key={category} style={commonStyles.subtitle}>Total de {category}: {quantity}</Text>
        ))}
        <Text style={[commonStyles.label, { fontSize: 16 }]}>Total de itens: {totalUnits}</Text>
        {quoteLoading && <Text style={commonStyles.subtitle}>Validando valores no servidor...</Text>}
        {!!quoteError && <Text style={commonStyles.error}>{quoteError}</Text>}
        {!!quote && <Text style={{ color: colors.success, fontWeight: "700" }}>Valores validados pelo backend.</Text>}
        <Text style={commonStyles.subtitle}>Subtotal: {money(subtotal)}</Text>
        <Text style={commonStyles.subtitle}>Taxa de entrega: {money(deliveryFee)}</Text>
        <Text style={[commonStyles.title, { fontSize: 24 }]}>Total: {money(total)}</Text>
      </View>

      {!!error && <Text style={commonStyles.error}>{error}</Text>}
      <PrimaryButton title="Confirmar pedido" onPress={submit} loading={sending} />
      <PrimaryButton title="Voltar ao texto" onPress={onBack} secondary disabled={sending} />
    </ScrollView>
  );
}
