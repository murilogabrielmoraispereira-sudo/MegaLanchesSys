import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { PrimaryButton } from "./src/components/PrimaryButton";
import { ScreenHeader } from "./src/components/ScreenHeader";
import { useAuth } from "./src/hooks/useAuth";
import * as api from "./src/services/api";
import { LoginScreen } from "./src/screens/LoginScreen";
import { MenuScreen } from "./src/screens/MenuScreen";
import { NewOrderScreen } from "./src/screens/NewOrderScreen";
import { OrdersScreen } from "./src/screens/OrdersScreen";
import { ReviewScreen } from "./src/screens/ReviewScreen";
import { SuccessScreen } from "./src/screens/SuccessScreen";
import { colors, commonStyles } from "./src/styles/theme";
import type { AppUser, Catalog, CreatedOrder, InterpretationResult, OrderDetails, ParserLearningAssociation, ParserLearningUse, ParserObservation } from "./src/types";
import { createRequestId } from "./src/utils/id";
import { interpretOrder } from "./src/utils/orderParser";

type Screen = "new" | "review" | "success" | "orders" | "menu" | "account";

function Tab({ active, label, symbol, onPress }: { active: boolean; label: string; symbol: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        paddingVertical: 9,
        borderRadius: 14,
        backgroundColor: active ? colors.primarySoft : "transparent",
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <Text style={{ color: active ? colors.primary : colors.muted, fontSize: 17, fontWeight: "900" }}>{symbol}</Text>
      <Text style={{ color: active ? colors.primary : colors.muted, fontSize: 11, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

export default function App() {
  const auth = useAuth();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [user, setUser] = useState<AppUser | null>(null);
  const [text, setText] = useState("");
  const [screen, setScreen] = useState<Screen>("new");
  const [interpretation, setInterpretation] = useState<InterpretationResult | null>(null);
  const [draft, setDraft] = useState<OrderDetails | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

  useEffect(() => api.setUnauthorizedHandler(auth.expireSession), [auth.expireSession]);

  const loadCatalog = async () => {
    if (!auth.token) return;
    setCatalogError("");
    try {
      setCatalog(await api.loadCatalog(auth.token));
    } catch (err) {
      if (api.isUnauthorizedError(err)) return;
      setCatalogError(err instanceof Error ? err.message : "Nao foi possivel carregar o cardapio.");
    }
  };

  useEffect(() => {
    setCatalog(null);
    setUser(null);
    if (auth.token) {
      loadCatalog();
      api.loadMe(auth.token).then(setUser).catch(() => setUser({ role: "atendente", permissions: { orders: true, menu: false } }));
    }
  }, [auth.token]);

  const startReview = () => {
    if (!catalog) return;
    const result = interpretOrder(text, catalog);
    const nextDraft: OrderDetails = {
      requestId: createRequestId(),
      cliente: result.pedido.cliente || "",
      telefone: result.pedido.telefone || "",
      telefoneFinal: result.pedido.telefoneFinal || "",
      endereco: result.pedido.endereco || "",
      tipoEntrega: result.pedido.tipoEntrega || "Entrega",
      pagamento: result.pedido.pagamento || "pix",
      troco: result.pedido.troco || "",
      obsGeral: result.pedido.obsGeral || "",
      itens: result.pedido.itens,
      complementosPedido: result.pedido.complementosPedido,
    };
    setInterpretation(result);
    setDraft(nextDraft);
    setScreen("review");
  };

  const submit = async (
    nextDraft: OrderDetails,
    learning: ParserLearningAssociation[] = [],
    uses: ParserLearningUse[] = [],
    observation?: ParserObservation
  ) => {
    if (!auth.token) throw new Error("Sessao expirada. Entre novamente.");
    setDraft(nextDraft);
    const result = await api.createOrder(auth.token, nextDraft);
    if (!result.duplicado && learning.length) {
      await api.sendParserFeedback(auth.token, learning).catch((err) => {
        console.warn("Nao foi possivel registrar o aprendizado do interpretador.", err);
      });
    }
    if (!result.duplicado && uses.length) {
      const produtosFinais = Array.from(new Set(nextDraft.itens.map((item) => String(item.produtoId))));
      await api.sendParserUsage(auth.token, uses, produtosFinais).catch((err) => {
        console.warn("Nao foi possivel registrar as metricas do interpretador.", err);
      });
    }
    if (!result.duplicado && observation) {
      await api.sendParserObservation(auth.token, observation).catch((err) => {
        console.warn("Nao foi possivel registrar a observacao anonima do interpretador.", err);
      });
    }
    setCreatedOrder(result);
    setScreen("success");
  };

  const reset = () => {
    setText("");
    setInterpretation(null);
    setDraft(null);
    setCreatedOrder(null);
    setScreen("new");
    loadCatalog();
  };

  if (auth.loading) {
    return <SafeAreaView style={[commonStyles.safeArea, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color={colors.primary} size="large" /></SafeAreaView>;
  }
  if (!auth.token) return <><StatusBar style="dark" /><LoginScreen onLogin={auth.signIn} /></>;
  if (!catalog) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={[commonStyles.screen, commonStyles.content, { justifyContent: "center" }]}>
          {catalogError ? (
            <View style={commonStyles.card}>
              <Text style={commonStyles.error}>{catalogError}</Text>
              <PrimaryButton title="Tentar novamente" onPress={loadCatalog} />
              <PrimaryButton title="Sair" secondary onPress={auth.signOut} />
            </View>
          ) : <ActivityIndicator color={colors.primary} size="large" />}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <StatusBar style="dark" />
      {screen === "new" && <NewOrderScreen text={text} setText={setText} onInterpret={startReview} catalogCount={catalog.cardapio.length} userName={user?.name} />}
      {screen === "orders" && (
        <OrdersScreen
          onLoad={() => api.loadOrders(auth.token!)}
          onLoadDeliveryPeople={() => api.loadDeliveryPeople(auth.token!)}
          onStatus={(pedidoId, status, entregador) => api.updateOrderStatus(auth.token!, pedidoId, status, entregador)}
          onReprint={async (pedidoId) => { await api.reprintOrder(auth.token!, pedidoId); }}
        />
      )}
      {screen === "menu" && (
        <MenuScreen
          canEdit={Boolean(user?.permissions.menu)}
          onLoad={() => api.loadManagedMenu(auth.token!)}
          onSave={async (product) => { await api.saveMenuProduct(auth.token!, product); }}
          onDelete={async (productId) => { await api.deleteMenuProduct(auth.token!, productId); }}
          onCatalogChanged={loadCatalog}
        />
      )}
      {screen === "account" && (
        <View style={[commonStyles.screen, commonStyles.content]}>
          <ScreenHeader title="Minha conta" subtitle="Perfil e acesso deste aparelho" />
          <View style={[commonStyles.card, { backgroundColor: colors.navy, borderColor: colors.navy }]}>
            <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }}>{(user?.name || "A").charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={{ color: "#fff", fontSize: 21, fontWeight: "900" }}>{user?.name || "Usuario do atendimento"}</Text>
            {!!user?.email && <Text style={{ color: "#d0d5dd" }}>{user.email}</Text>}
            <Text style={{ color: "#d0d5dd" }}>{user?.role === "admin" ? "Administrador" : "Atendente"}</Text>
          </View>
          <View style={commonStyles.card}>
            <Text style={commonStyles.sectionTitle}>Permissoes</Text>
            <View style={commonStyles.wrap}>
              <Text style={{ color: colors.success, backgroundColor: colors.successSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, fontWeight: "800" }}>Pedidos</Text>
              <Text style={{ color: user?.permissions.menu ? colors.success : colors.muted, backgroundColor: user?.permissions.menu ? colors.successSoft : colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, fontWeight: "800" }}>Cardapio {user?.permissions.menu ? "liberado" : "somente leitura"}</Text>
            </View>
          </View>
          <View style={commonStyles.card}>
            <Text style={commonStyles.sectionTitle}>Sessao</Text>
            <Text style={commonStyles.subtitle}>Ao sair, sera necessario escolher a conta e informar a senha novamente.</Text>
            <PrimaryButton title="Sair desta conta" secondary onPress={auth.signOut} />
          </View>
        </View>
      )}
      {screen === "review" && draft && interpretation && (
        <ReviewScreen
          key={draft.requestId}
          initialDraft={draft}
          catalog={catalog}
          initialAmbiguities={interpretation.ambiguidades}
          initialUnknown={interpretation.naoIdentificados}
          initialWarnings={interpretation.avisos}
          initialLearningUses={Array.isArray(interpretation.aprendizadosUsados) ? interpretation.aprendizadosUsados : []}
          initialRecognitions={Array.isArray(interpretation.reconhecimentos) ? interpretation.reconhecimentos : []}
          onSearchContacts={(query) => api.searchContacts(auth.token!, query)}
          onLoadCustomerHistory={(telefone) => api.loadCustomerHistory(auth.token!, telefone)}
          onLoadCustomerAiInsight={(telefone) => api.loadCustomerAiInsight(auth.token!, telefone)}
          onValidateOrder={(pedido) => api.validateOrder(auth.token!, pedido)}
          onBack={() => setScreen("new")}
          onSubmit={submit}
        />
      )}
      {screen === "success" && createdOrder && (
        <SuccessScreen
          order={createdOrder}
          onNew={reset}
          onView={() => setScreen("orders")}
          onRetryNotification={async () => {
            if (!auth.token) throw new Error("Sessao expirada.");
            await api.retryOrderNotification(auth.token, createdOrder.pedidoId);
            setCreatedOrder({ ...createdOrder, mensagem: { enviada: true, motivo: "" } });
          }}
        />
      )}
      {!["review", "success"].includes(screen) && (
        <View style={{ flexDirection: "row", gap: 4, paddingHorizontal: 8, paddingTop: 7, paddingBottom: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
          <Tab active={screen === "new"} label="Novo" symbol="+" onPress={() => setScreen("new")} />
          <Tab active={screen === "orders"} label="Pedidos" symbol="#" onPress={() => setScreen("orders")} />
          <Tab active={screen === "menu"} label="Cardapio" symbol="M" onPress={() => setScreen("menu")} />
          <Tab active={screen === "account"} label="Conta" symbol="EU" onPress={() => setScreen("account")} />
        </View>
      )}
    </SafeAreaView>
  );
}
