import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors, commonStyles } from "../styles/theme";
import type { DeliveryPerson, ManagedOrder } from "../types";
import { formatItemChanges } from "../utils/itemChanges";

type Props = {
  onLoad: () => Promise<ManagedOrder[]>;
  onLoadDeliveryPeople: () => Promise<DeliveryPerson[]>;
  onStatus: (pedidoId: number, status: string, entregador?: string) => Promise<ManagedOrder>;
  onReprint: (pedidoId: number) => Promise<void>;
};

const STATUS = ["todos", "recebido", "preparo", "pronto", "em_entrega", "entregue", "cancelado"] as const;
const TIPOS = ["todos", "entrega", "retirada", "na porta"] as const;

function money(value: number) {
  return `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;
}

function normalize(value: unknown) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function orderType(order: ManagedOrder) {
  const text = normalize(`${order.tipoEntrega} ${order.origemPedido}`);
  if (text.includes("porta") || text.includes("balcao")) return "na porta";
  if (text.includes("retirada")) return "retirada";
  return "entrega";
}

function orderTypeLabel(order: ManagedOrder) {
  const type = orderType(order);
  if (type === "na porta") return "NA PORTA";
  if (type === "retirada") return "RETIRADA";
  return "ENTREGA";
}

function nextStatus(order: ManagedOrder) {
  const current = normalize(order.status);
  if (current === "recebido") return { label: "Enviar para preparo", status: "preparo" };
  if (current === "preparo") return { label: "Marcar pronto", status: "pronto" };
  if (current === "pronto") {
    return orderType(order) === "entrega"
      ? { label: "Saiu para entrega", status: "em_entrega" }
      : { label: "Marcar entregue", status: "entregue" };
  }
  if (current === "em_entrega") return { label: "Marcar entregue", status: "entregue" };
  return null;
}

function itemSummary(order: ManagedOrder) {
  return (Array.isArray(order.carrinho) ? order.carrinho : [])
    .slice(0, 4)
    .map((item) => `${item.qtd || 1}x ${item.nome}`)
    .join(", ");
}

function totalOrder(order: ManagedOrder) {
  const subtotal = (Array.isArray(order.carrinho) ? order.carrinho : []).reduce((sum, item) => {
    const add = (Array.isArray(item.adicionais) ? item.adicionais : []).reduce(
      (acc, extra) => acc + Number(extra.preco || 0) * Number(extra.qtd || 1)
        * (extra.escopo === "total" ? 1 : Number(item.qtd || 1)),
      0
    );
    return sum + Number(item.preco || 0) * Number(item.qtd || 1) + add;
  }, 0);
  return Math.max(0, subtotal + Number(order.taxaEntrega || 0) - Number(order.desconto || 0));
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primarySoft : colors.surface,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Text style={{ color: active ? colors.primary : colors.text, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

export function OrdersScreen({ onLoad, onLoadDeliveryPeople, onStatus, onReprint }: Props) {
  const [orders, setOrders] = useState<ManagedOrder[]>([]);
  const [deliveryPeople, setDeliveryPeople] = useState<DeliveryPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUS)[number]>("todos");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("todos");
  const [selected, setSelected] = useState<ManagedOrder | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deliveryDrafts, setDeliveryDrafts] = useState<Record<number, string>>({});

  const reload = async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError("");
    try {
      setOrders(await onLoad());
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "Nao foi possivel carregar pedidos.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadDeliveryPeople = async () => {
    try {
      setDeliveryPeople(await onLoadDeliveryPeople());
    } catch {
      setDeliveryPeople([]);
    }
  };

  useEffect(() => {
    reload();
    loadDeliveryPeople();
    const timer = setInterval(() => reload(true), 8000);
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    const term = normalize(query);
    return orders.filter((order) => {
      if (status !== "todos" && order.status !== status) return false;
      if (tipo !== "todos" && orderType(order) !== tipo) return false;
      if (!term) return true;
      const haystack = normalize(`${order.id} ${order.cliente} ${order.telefone} ${String(order.telefone || "").slice(-4)}`);
      return haystack.includes(term);
    });
  }, [orders, query, status, tipo]);

  const summary = useMemo(() => ({
    ativos: orders.filter((order) => !["entregue", "cancelado"].includes(normalize(order.status))).length,
    preparo: orders.filter((order) => normalize(order.status) === "preparo").length,
    prontos: orders.filter((order) => ["pronto", "em_entrega"].includes(normalize(order.status))).length,
  }), [orders]);

  const openWhatsApp = async (telefone: string) => {
    const digits = String(telefone || "").replace(/\D/g, "");
    if (!digits) return;
    const number = digits.startsWith("55") ? digits : `55${digits}`;
    try {
      await Linking.openURL(`https://wa.me/${number}`);
    } catch {
      Alert.alert("WhatsApp", "Nao foi possivel abrir o contato neste aparelho.");
    }
  };

  const changeStatus = async (order: ManagedOrder, next: string) => {
    const sensitive = new Set(["cancelado", "entregue"]);
    if (sensitive.has(next)) {
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert("Confirmar acao", `Alterar pedido #${order.id} para ${next}?`, [
          { text: "Voltar", style: "cancel", onPress: () => resolve(false) },
          { text: "Confirmar", style: "destructive", onPress: () => resolve(true) },
        ]);
      });
      if (!ok) return;
    }
    const entregador = deliveryDrafts[order.id] ?? order.entregador ?? "";
    if (next === "em_entrega" && orderType(order) === "entrega" && !entregador.trim()) {
      Alert.alert("Entregador", "Informe ou selecione o entregador antes de enviar para entrega.");
      return;
    }
    setBusyId(order.id);
    try {
      const updated = await onStatus(order.id, next, entregador);
      setOrders((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelected((current) => current && current.id === updated.id ? updated : current);
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Nao foi possivel alterar o pedido.");
    } finally {
      setBusyId(null);
    }
  };

  const reprint = async (order: ManagedOrder) => {
    setBusyId(order.id);
    try {
      await onReprint(order.id);
      Alert.alert("Impressao", `Pedido #${order.id} enviado para a fila de impressao.`);
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Nao foi possivel reimprimir.");
    } finally {
      setBusyId(null);
    }
  };

  const updateDeliveryDraft = (orderId: number, nome: string) => {
    setDeliveryDrafts((current) => ({ ...current, [orderId]: nome }));
  };

  return (
    <ScrollView
      style={commonStyles.screen}
      contentContainerStyle={commonStyles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { reload(); loadDeliveryPeople(); }} tintColor={colors.primary} />}
    >
      <ScreenHeader title="Pedidos" subtitle="Acompanhe e avance cada etapa da operacao." />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[
          { label: "Ativos", value: summary.ativos, color: colors.primary, background: colors.primarySoft },
          { label: "Preparo", value: summary.preparo, color: colors.warning, background: colors.warningSoft },
          { label: "Prontos", value: summary.prontos, color: colors.success, background: colors.successSoft },
        ].map((item) => (
          <View key={item.label} style={{ flex: 1, borderRadius: 16, padding: 12, backgroundColor: item.background }}>
            <Text style={{ color: item.color, fontSize: 23, fontWeight: "900" }}>{item.value}</Text>
            <Text style={{ color: item.color, fontSize: 12, fontWeight: "800" }}>{item.label}</Text>
          </View>
        ))}
      </View>
      <TextInput value={query} onChangeText={setQuery} placeholder="Buscar por numero, nome, telefone ou final" style={commonStyles.input} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {STATUS.map((item) => <Chip key={item} active={status === item} label={item === "todos" ? "Todos" : item} onPress={() => setStatus(item)} />)}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {TIPOS.map((item) => <Chip key={item} active={tipo === item} label={item === "todos" ? "Todos tipos" : item.toUpperCase()} onPress={() => setTipo(item)} />)}
      </View>
      <PrimaryButton title="Atualizar lista" secondary loading={loading} onPress={() => { reload(); loadDeliveryPeople(); }} />
      {!!error && <Text style={commonStyles.error}>{error}</Text>}

      {filtered.map((order) => (
        <Pressable key={order.id} onPress={() => setSelected(selected?.id === order.id ? null : order)} style={commonStyles.card}>
          <Text style={commonStyles.label}>#{order.id} · {orderTypeLabel(order)} · {order.status}</Text>
          <Text style={commonStyles.subtitle}>{order.cliente || "Sem nome"} · {order.pagamento || "Pagamento nao informado"} · {money(totalOrder(order))}</Text>
          <Text style={commonStyles.subtitle}>{itemSummary(order) || "Sem itens"}</Text>
          <Text style={commonStyles.subtitle}>Itens: {(order.carrinho || []).reduce((sum, item) => sum + Number(item.qtd || 1), 0)}</Text>
          {selected?.id === order.id && (
            <View style={{ gap: 10 }}>
              <Text style={commonStyles.subtitle}>Telefone: {order.telefone || "-"}</Text>
              {!!order.telefone && <PrimaryButton title="Abrir conversa no WhatsApp" secondary onPress={() => openWhatsApp(order.telefone)} />}
              <Text style={commonStyles.subtitle}>Criado em: {order.created_at ? new Date(order.created_at).toLocaleString("pt-BR") : "-"}</Text>
              {!!order.obsGeral && <Text style={commonStyles.subtitle}>Observacao geral: {order.obsGeral}</Text>}
              {(order.carrinho || []).map((item, index) => (
                <Text key={`${item.nome}-${index}`} style={commonStyles.subtitle}>
                  {item.qtd || 1}x {item.nome}
                  {formatItemChanges(item).linhas.length ? ` · ${formatItemChanges(item).linhas.join(" · ")}` : ""}
                </Text>
              ))}
              {orderType(order) === "entrega" && <Text style={commonStyles.subtitle}>Endereco: {order.endereco || "-"}</Text>}
              {orderType(order) === "entrega" && (
                <View style={{ gap: 8 }}>
                  <Text style={commonStyles.label}>Entregador</Text>
                  <TextInput
                    value={deliveryDrafts[order.id] ?? order.entregador ?? ""}
                    onChangeText={(value) => updateDeliveryDraft(order.id, value)}
                    placeholder="Nome do entregador"
                    style={commonStyles.input}
                  />
                  {!!deliveryPeople.length && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {deliveryPeople.filter((person) => person.ativo).map((person) => (
                        <Chip
                          key={person.id}
                          active={(deliveryDrafts[order.id] ?? order.entregador ?? "") === person.nome}
                          label={person.nome}
                          onPress={() => updateDeliveryDraft(order.id, person.nome)}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {["recebido", "preparo", "pronto", "em_entrega", "entregue", "cancelado"].map((next) => (
                  <Chip key={next} active={order.status === next} label={next} onPress={() => changeStatus(order, next)} />
                ))}
              </View>
              {nextStatus(order) && <PrimaryButton title={nextStatus(order)!.label} loading={busyId === order.id} onPress={() => changeStatus(order, nextStatus(order)!.status)} />}
              {order.status !== "cancelado" && order.status !== "entregue" && (
                <PrimaryButton title="Cancelar pedido" secondary loading={busyId === order.id} onPress={() => changeStatus(order, "cancelado")} />
              )}
              <PrimaryButton title="Reimprimir pedido" secondary loading={busyId === order.id} onPress={() => reprint(order)} />
            </View>
          )}
        </Pressable>
      ))}
      {!loading && !filtered.length && (
        <View style={[commonStyles.card, commonStyles.emptyState]}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>Nenhum pedido encontrado</Text>
          <Text style={[commonStyles.subtitle, { textAlign: "center" }]}>Altere os filtros ou puxe a tela para atualizar.</Text>
        </View>
      )}
    </ScrollView>
  );
}
