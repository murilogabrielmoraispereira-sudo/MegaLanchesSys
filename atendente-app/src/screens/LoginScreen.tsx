import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import * as api from "../services/api";
import { colors, commonStyles } from "../styles/theme";
import type { LoginAccount } from "../types";

type Props = { onLogin: (identifier: string, password: string, useEmail?: boolean) => Promise<void> };

export function LoginScreen({ onLogin }: Props) {
  const [accounts, setAccounts] = useState<LoginAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [legacyMode, setLegacyMode] = useState(false);
  const [useEmail, setUseEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.loadLoginAccounts()
      .then(({ items, setupRequired }) => {
        setAccounts(items);
        setLegacyMode(setupRequired);
        if (items.length === 1) setSelectedAccountId(items[0].id);
        if (!items.length && !setupRequired) setUseEmail(true);
      })
      .catch(() => setUseEmail(true));
  }, []);

  const submit = async () => {
    const identifier = useEmail ? email.trim() : selectedAccountId;
    if (!legacyMode && !identifier) return setError(useEmail ? "Informe o e-mail do atendente." : "Escolha quem esta acessando.");
    if (!password) return setError("Informe a senha do atendente.");
    setLoading(true);
    setError("");
    try {
      await onLogin(identifier, password, useEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
    <KeyboardAvoidingView style={commonStyles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[commonStyles.content, { flexGrow: 1, justifyContent: "center" }]} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", marginBottom: 8, gap: 10 }}>
          <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-5deg" }] }}>
            <Text style={{ color: "#fff", fontSize: 29, fontWeight: "900" }}>ML</Text>
          </View>
          <Text style={[commonStyles.title, { textAlign: "center" }]}>Mega Lanches</Text>
          <Text style={[commonStyles.subtitle, { textAlign: "center" }]}>Operacao do atendimento em um so lugar</Text>
        </View>
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Entrar no atendimento</Text>
          {legacyMode ? (
            <Text style={commonStyles.subtitle}>Use a senha administrativa atual. Depois de criar as contas no painel, elas aparecerao aqui.</Text>
          ) : !useEmail && accounts.length > 0 ? (
            <>
              <Text style={commonStyles.label}>Quem esta acessando?</Text>
              {accounts.map((account) => {
                const selected = selectedAccountId === account.id;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={account.id}
                    onPress={() => {
                      setSelectedAccountId(account.id);
                      setError("");
                    }}
                    style={({ pressed }) => ({
                      borderWidth: 2,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primarySoft : colors.surfaceAlt,
                      borderRadius: 15,
                      paddingHorizontal: 14,
                      paddingVertical: 13,
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <View style={commonStyles.row}>
                      <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: selected ? colors.primary : colors.border, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: selected ? "#fff" : colors.muted, fontWeight: "900" }}>{account.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: selected ? "800" : "600" }}>{account.name}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </>
          ) : (
            <>
              <Text style={commonStyles.label}>E-mail</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="username"
                value={email}
                onChangeText={setEmail}
                placeholder="voce@exemplo.com"
                style={commonStyles.input}
              />
            </>
          )}
          <Text style={commonStyles.label}>Senha</Text>
          <View style={{ position: "relative" }}>
            <TextInput
              autoCapitalize="none"
              autoComplete="current-password"
              secureTextEntry={!showPassword}
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submit}
              placeholder="Digite a senha"
              style={[commonStyles.input, { paddingRight: 76 }]}
            />
            <Pressable onPress={() => setShowPassword((value) => !value)} style={{ position: "absolute", right: 14, top: 14 }}>
              <Text style={{ color: colors.primary, fontWeight: "800" }}>{showPassword ? "Ocultar" : "Mostrar"}</Text>
            </Pressable>
          </View>
          {!!error && <Text style={commonStyles.error}>{error}</Text>}
          <PrimaryButton title="Entrar" onPress={submit} loading={loading} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
