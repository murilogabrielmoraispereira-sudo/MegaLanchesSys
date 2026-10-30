import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors, commonStyles } from "../styles/theme";
import type { CatalogProduct } from "../types";

type MenuData = {
  itens: CatalogProduct[];
  adicionais: Array<{ nome: string; preco: number }>;
  categorias: Array<{ id: number; nome: string; slug: string; order_index?: number }>;
};

type Draft = Partial<CatalogProduct> & { ingredientesTexto?: string };

type Props = {
  canEdit: boolean;
  onLoad: () => Promise<MenuData>;
  onSave: (product: Partial<CatalogProduct> & { id?: string | number }) => Promise<void>;
  onDelete: (productId: string | number) => Promise<void>;
  onCatalogChanged: () => Promise<void>;
};

function money(value: number) {
  return `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;
}

export function MenuScreen({ canEdit, onLoad, onSave, onDelete, onCatalogChanged }: Props) {
  const [data, setData] = useState<MenuData>({ itens: [], adicionais: [], categorias: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todos");
  const [draft, setDraft] = useState<Draft | null>(null);

  const reload = async () => {
    setLoading(true);
    setMessage("");
    try {
      setData(await onLoad());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel carregar o cardapio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return data.itens.filter((item) => {
      if (category !== "todos" && item.categoria !== category) return false;
      return !term || `${item.nome} ${item.categoria} ${item.ingredientes?.join(" ")}`.toLowerCase().includes(term);
    });
  }, [data.itens, query, category]);

  const startEdit = (product?: CatalogProduct) => {
    if (product) {
      setDraft({
        ...product,
        ingredientesTexto: (Array.isArray(product.ingredientes) ? product.ingredientes : []).join(", "),
      });
      return;
    }
    setDraft({
      nome: "",
      preco: 0,
      categoria: data.categorias[0]?.slug || "",
      ingredientes: [],
      ingredientesTexto: "",
      img: "",
      order_index: data.itens.length,
      disponivel: true,
    });
  };

  const saveProduct = async (product: Draft) => {
    const ingredientes = String(product.ingredientesTexto || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    await onSave({
      id: product.id,
      nome: String(product.nome || "").trim(),
      preco: Number(product.preco || 0),
      categoria: String(product.categoria || "").trim(),
      ingredientes,
      img: String(product.img || "").trim(),
      disponivel: product.disponivel !== false,
      order_index: Number(product.order_index || 0),
    });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage("");
    try {
      await saveProduct(draft);
      setMessage("Produto atualizado com sucesso.");
      setDraft(null);
      await reload();
      await onCatalogChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel salvar a alteracao.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (product: CatalogProduct) => {
    setSaving(true);
    setMessage("");
    try {
      await saveProduct({
        ...product,
        ingredientesTexto: (Array.isArray(product.ingredientes) ? product.ingredientes : []).join(", "),
        disponivel: product.disponivel === false,
      });
      setMessage("Produto atualizado com sucesso.");
      await reload();
      await onCatalogChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel alterar disponibilidade.");
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (product: CatalogProduct) => {
    const ok = await new Promise<boolean>((resolve) => {
      Alert.alert("Excluir produto", `Remover "${product.nome}" do cardapio?`, [
        { text: "Voltar", style: "cancel", onPress: () => resolve(false) },
        { text: "Excluir", style: "destructive", onPress: () => resolve(true) },
      ]);
    });
    if (!ok) return;
    setSaving(true);
    setMessage("");
    try {
      await onDelete(product.id);
      setMessage("Produto excluido com sucesso.");
      if (draft?.id === product.id) setDraft(null);
      await reload();
      await onCatalogChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel excluir o produto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={commonStyles.screen}
      contentContainerStyle={commonStyles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
    >
      <ScreenHeader
        title="Cardapio"
        subtitle={`${data.itens.length} produtos sincronizados com site e painel.`}
        action={canEdit ? (
          <Pressable onPress={() => startEdit()} style={{ backgroundColor: colors.primary, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ color: "#fff", fontWeight: "900" }}>+ Criar</Text>
          </Pressable>
        ) : undefined}
      />
      {!canEdit && <Text style={commonStyles.error}>Seu usuario pode acompanhar pedidos, mas nao pode editar o cardapio.</Text>}
      <TextInput value={query} onChangeText={setQuery} placeholder="Pesquisar produto" style={commonStyles.input} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[{ slug: "todos", nome: "Todos" }, ...data.categorias].map((item) => (
          <Pressable
            key={item.slug}
            onPress={() => setCategory(item.slug)}
            style={{ backgroundColor: category === item.slug ? colors.primarySoft : colors.surface, borderColor: category === item.slug ? colors.primary : colors.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 }}
          >
            <Text style={{ color: category === item.slug ? colors.primary : colors.text, fontWeight: "800" }}>{item.nome}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <PrimaryButton title="Atualizar cardapio" secondary loading={loading} onPress={reload} />
      {!!message && <Text style={message.includes("sucesso") ? commonStyles.subtitle : commonStyles.error}>{message}</Text>}

      {!!draft && (
        <View style={commonStyles.card}>
          <Text style={commonStyles.label}>{draft.id ? "Editar produto" : "Criar produto"}</Text>
          <TextInput value={String(draft.nome || "")} onChangeText={(nome) => setDraft({ ...draft, nome })} placeholder="Nome" style={commonStyles.input} />
          <TextInput value={String(draft.preco ?? "")} onChangeText={(preco) => setDraft({ ...draft, preco: Number(preco.replace(",", ".")) || 0 })} placeholder="Preco" keyboardType="decimal-pad" style={commonStyles.input} />
          <TextInput value={String(draft.categoria || "")} onChangeText={(categoria) => setDraft({ ...draft, categoria })} placeholder="Categoria" style={commonStyles.input} />
          <TextInput value={String(draft.img || "")} onChangeText={(img) => setDraft({ ...draft, img })} placeholder="URL da imagem" style={commonStyles.input} />
          <TextInput value={String(draft.order_index ?? "")} onChangeText={(order_index) => setDraft({ ...draft, order_index: Number(order_index) || 0 })} placeholder="Ordem no cardapio" keyboardType="number-pad" style={commonStyles.input} />
          <TextInput
            value={String(draft.ingredientesTexto || "")}
            onChangeText={(ingredientesTexto) => setDraft({ ...draft, ingredientesTexto })}
            placeholder="Ingredientes separados por virgula"
            style={commonStyles.input}
          />
          <PrimaryButton title={draft.disponivel === false ? "Marcar disponivel" : "Marcar indisponivel"} secondary onPress={() => setDraft({ ...draft, disponivel: draft.disponivel === false })} />
          <PrimaryButton title="Salvar alteracoes" loading={saving} onPress={save} />
          {!!draft.id && <PrimaryButton title="Excluir produto" secondary disabled={saving} onPress={() => removeProduct(draft as CatalogProduct)} />}
          <PrimaryButton title="Cancelar alteracoes" secondary disabled={saving} onPress={() => setDraft(null)} />
        </View>
      )}

      {filtered.map((product) => (
        <View key={String(product.id)} style={[commonStyles.card, { opacity: product.disponivel === false ? 0.72 : 1 }]}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[commonStyles.sectionTitle, { fontSize: 17 }]}>{product.nome}</Text>
              <Text style={{ color: colors.primary, fontSize: 17, fontWeight: "900" }}>{money(product.preco)}</Text>
            </View>
            <Text style={{ color: product.disponivel === false ? colors.danger : colors.success, backgroundColor: product.disponivel === false ? colors.dangerSoft : colors.successSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 11, fontWeight: "900" }}>{product.disponivel === false ? "INDISPONIVEL" : "DISPONIVEL"}</Text>
          </View>
          <Text style={commonStyles.subtitle}>{product.categoria || "sem categoria"}</Text>
          {!!product.img && <Text style={commonStyles.subtitle}>Imagem: {product.img}</Text>}
          {product.order_index !== undefined && <Text style={commonStyles.subtitle}>Ordem: {product.order_index}</Text>}
          {!!product.ingredientes?.length && <Text style={commonStyles.subtitle}>Ingredientes: {product.ingredientes.join(", ")}</Text>}
          {canEdit && (
            <View style={{ gap: 8 }}>
              <PrimaryButton title="Editar" secondary onPress={() => startEdit(product)} />
              <PrimaryButton title={product.disponivel === false ? "Marcar disponivel" : "Marcar indisponivel"} secondary loading={saving} onPress={() => toggleAvailability(product)} />
              <PrimaryButton title="Excluir" secondary loading={saving} onPress={() => removeProduct(product)} />
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}
