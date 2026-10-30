import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors, commonStyles } from "../styles/theme";

type Props = {
  text: string;
  setText: (value: string) => void;
  onInterpret: () => void;
  catalogCount: number;
  userName?: string;
};

const EXAMPLES = [
  "2 x-tudo e 1 coca 2 litros, retirada, pix",
  "1 x-salada sem milho, entrega para Joao",
  "3 hot dog, um sem batata, pagamento dinheiro",
];

export function NewOrderScreen({ text, setText, onInterpret, catalogCount, userName }: Props) {
  return (
    <KeyboardAvoidingView style={commonStyles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={commonStyles.screen}
        contentContainerStyle={commonStyles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title="Novo pedido"
          subtitle={userName ? `Pronto para atender, ${userName.split(" ")[0]}.` : "Transforme a mensagem do cliente em pedido."}
          action={
            <View style={{ backgroundColor: colors.successSoft, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 }}>
              <Text style={{ color: colors.success, fontSize: 12, fontWeight: "900" }}>{catalogCount} produtos</Text>
            </View>
          }
        />

        <View style={[commonStyles.card, { borderColor: colors.primary, borderWidth: 1.5 }]}>
          <View style={commonStyles.row}>
            <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.primary, fontSize: 20, fontWeight: "900" }}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={commonStyles.sectionTitle}>Cole ou digite a conversa</Text>
              <Text style={commonStyles.subtitle}>Pode escrever do jeito que o cliente falou.</Text>
            </View>
          </View>
          <TextInput
            multiline
            textAlignVertical="top"
            value={text}
            onChangeText={setText}
            placeholder="Ex.: 2 x-tudo, um sem milho, 1 coca lata. Entrega para Joao..."
            placeholderTextColor={colors.muted}
            style={[commonStyles.input, { minHeight: 205, lineHeight: 23 }]}
          />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={commonStyles.subtitle}>{text.length} caracteres</Text>
            {!!text && (
              <Pressable onPress={() => setText("")} hitSlop={10}>
                <Text style={{ color: colors.danger, fontWeight: "800" }}>Limpar texto</Text>
              </Pressable>
            )}
          </View>
          <PrimaryButton title="Interpretar pedido" onPress={onInterpret} disabled={!text.trim()} />
        </View>

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Exemplos rapidos</Text>
          <Text style={commonStyles.subtitle}>Toque em um exemplo para preencher o campo.</Text>
          <View style={{ gap: 8 }}>
            {EXAMPLES.map((example) => (
              <Pressable
                key={example}
                onPress={() => setText(example)}
                style={({ pressed }) => ({
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 13,
                  padding: 12,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: colors.text, lineHeight: 20 }}>{example}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: colors.infoSoft, borderRadius: 16, padding: 14, flexDirection: "row", gap: 10 }}>
          <Text style={{ color: colors.info, fontWeight: "900" }}>DICA</Text>
          <Text style={{ color: colors.info, flex: 1, lineHeight: 20 }}>Inclua entrega ou retirada, forma de pagamento, nome e telefone quando estiverem na conversa.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
