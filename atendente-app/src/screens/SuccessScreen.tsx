import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, commonStyles } from "../styles/theme";
import type { CreatedOrder } from "../types";

type Props = { order: CreatedOrder; onNew: () => void; onView: () => void; onRetryNotification: () => Promise<void> };

export function SuccessScreen({ order, onNew, onView, onRetryNotification }: Props) {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");
  const retry = async () => {
    setRetrying(true);
    setRetryError("");
    try {
      await onRetryNotification();
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "A mensagem ainda nao foi enviada.");
    } finally {
      setRetrying(false);
    }
  };
  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={[commonStyles.content, { flexGrow: 1, justifyContent: "center" }]}>
      <View style={[commonStyles.card, { borderColor: colors.success }]}>
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.successSoft, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.success, fontSize: 28, fontWeight: "900" }}>OK</Text>
          </View>
          <Text style={{ color: colors.success, fontWeight: "900", fontSize: 20 }}>Pedido registrado</Text>
          <Text style={[commonStyles.title, { fontSize: 38 }]}>#{order.pedidoId}</Text>
        </View>
        <View style={commonStyles.divider} />
        <Text style={commonStyles.subtitle}>Cliente: {order.cliente}</Text>
        <Text style={commonStyles.subtitle}>Total: R$ {Number(order.total).toFixed(2).replace(".", ",")}</Text>
        <Text style={commonStyles.subtitle}>Horario: {new Date(order.createdAt).toLocaleString("pt-BR")}</Text>
        <Text style={commonStyles.subtitle}>Status: {order.status}</Text>
        {order.mensagem?.enviada ? (
          <Text style={{ color: colors.success, fontWeight: "700" }}>Confirmacao enviada pelo WhatsApp.</Text>
        ) : (
          <Text style={commonStyles.error}>Pedido criado, mas a mensagem nao foi enviada.</Text>
        )}
        {!order.mensagem?.enviada && order.mensagem?.motivo !== "sem_telefone" && (
          <PrimaryButton title="Tentar enviar novamente" secondary loading={retrying} onPress={retry} />
        )}
        {!!retryError && <Text style={commonStyles.error}>{retryError}</Text>}
        {order.duplicado && <Text style={commonStyles.subtitle}>O servidor reconheceu uma tentativa repetida e manteve apenas um pedido.</Text>}
        <PrimaryButton title="Novo pedido" onPress={onNew} />
        <PrimaryButton title="Ver pedido" secondary onPress={onView} />
      </View>
    </ScrollView>
  );
}
