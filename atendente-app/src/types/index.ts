export type CatalogProduct = {
  id: string | number;
  nome: string;
  preco: number;
  categoria: string;
  ingredientes: string[];
  img?: string;
  disponivel: boolean;
  order_index?: number;
  tipo?: string;
  apelidos?: string[];
  promocao?: {
    preco_unidade: number;
    preco_combo: number;
    min_qtd: number;
  };
};

export type LoginAccount = {
  id: string;
  name: string;
};

export type ParserLearningAssociation = {
  termo: string;
  produtoId: string;
  produtoNome: string;
};

export type ParserLearningUse = {
  termo: string;
  produtoId: string;
  produtoNome: string;
};

export type ParserRecognition = ParserLearningUse & {
  source: "fuzzy";
};

export type ParserObservationItem = Pick<OrderItem, "produtoId" | "qtd" | "removidos" | "adicionais"> & { obs?: string };

export type ParserObservation = {
  requestId: string;
  initialItems: ParserObservationItem[];
  finalItems: ParserObservationItem[];
  ambiguities: number;
  unknown: number;
  warnings: number;
};

export type CatalogAdditional = {
  nome: string;
  preco: number;
};

export type Catalog = {
  cardapio: CatalogProduct[];
  adicionais: CatalogAdditional[];
  taxaEntrega: number;
  atualizadoEm: string;
};

export type OrderAdditional = CatalogAdditional & { qtd: number; escopo?: "total" | "unidade" };
export type OrderComplement = OrderAdditional;

export type OrderItem = {
  produtoId: string;
  nome: string;
  preco: number;
  qtd: number;
  adicionais: OrderAdditional[];
  removidos: string[];
  obs: string;
  tipo: string;
  categoria: string;
};

export type OrderDetails = {
  requestId: string;
  cliente: string;
  telefone: string;
  telefoneFinal?: string;
  endereco: string;
  tipoEntrega: "Entrega" | "Retirada" | "Na porta";
  pagamento: "" | "pix" | "dinheiro" | "cartao";
  troco: string;
  obsGeral: string;
  itens: OrderItem[];
  complementosPedido: OrderComplement[];
};

export type InterpretationAmbiguity = {
  trecho: string;
  sugestoes: CatalogProduct[];
};

export type InterpretationResult = {
  pedido: Partial<OrderDetails> & { itens: OrderItem[]; complementosPedido: OrderComplement[] };
  ambiguidades: InterpretationAmbiguity[];
  naoIdentificados: string[];
  avisos: string[];
  aprendizadosUsados: ParserLearningUse[];
  reconhecimentos: ParserRecognition[];
};

export type ContactMatch = {
  telefone: string;
  telefoneOculto: string;
  finalTelefone: string;
  nome: string;
  ultimaMensagem: string;
  atualizadoEm: string;
  pedidosCount?: number;
  totalGasto?: number;
  ticketMedio?: number;
  ultimoPedido?: string;
  produtoFavorito?: string;
  segmento?: "sem_pedido" | "novo" | "ativo" | "recorrente" | "vip" | "sumido";
};

export type CreatedOrder = {
  pedidoId: number;
  cliente: string;
  total: number;
  status: string;
  createdAt: string;
  duplicado?: boolean;
  mensagem?: {
    enviada: boolean;
    motivo: string;
  };
};

export type AppUser = {
  name?: string;
  email?: string;
  role: "atendente" | "admin";
  permissions: {
    orders: boolean;
    menu: boolean;
  };
};

export type ManagedOrder = {
  id: number;
  cliente: string;
  telefone: string;
  endereco: string;
  tipoEntrega: string;
  origemPedido: string;
  pagamento: string;
  pagamentosDetalhes?: Array<{ metodo: string; valor: number }>;
  troco: string;
  carrinho: OrderItem[];
  complementosPedido?: OrderComplement[];
  obsGeral: string;
  status: string;
  entregador?: string;
  entregueEm?: string;
  saiuParaEntrega?: string;
  created_at?: string;
  desconto?: number;
  taxaEntrega?: number;
};

export type CustomerHistory = {
  resumo: {
    telefone: string;
    nome: string;
    pedidosCount: number;
    totalGasto: number;
    ticketMedio: number;
    ultimoPedido: string;
    produtoFavorito: string;
    formaPagamentoFavorita?: string;
    aprendizado?: {
      pedidosAnalisados: number;
      produtosFavoritos: Array<{ nome: string; qtd: number; pedidos: number }>;
      preferenciasRecorrentes: Array<{
        tipo: "remover" | "adicionar";
        nome: string;
        ocorrencias: number;
        confianca: number;
      }>;
      formaPagamentoFavorita: string;
      tipoEntregaFavorito: string;
    };
    segmento: string;
  } | null;
  pedidos: ManagedOrder[];
};

export type CustomerAiInsight = {
  status: "ready" | "disabled" | "unconfigured" | "insufficient_data" | "error";
  configured?: boolean;
  source?: "local";
  model?: string;
  generatedAt?: string;
  error?: string;
  insight?: {
    resumo: string;
    perfil: "novo" | "ocasional" | "recorrente" | "fiel" | "inativo";
    sugestoesAtendimento: string[];
    produtosProvaveis: Array<{
      produtoId: string;
      produtoNome: string;
      motivo: string;
      confianca: number;
      evidencias?: {
        pedidosHistoricos: number;
        pedidosRecentes: number;
        pesoRecente: number;
        previsoesAvaliadas: number;
      };
    }>;
    preferenciasConfirmar: string[];
    alertas: string[];
    mudancaHabito?: {
      changed: boolean;
      previous: string;
      current: string;
      recentOrders: number;
      message: string;
    } | null;
    oportunidadeMarketing: {
      acao: "nenhuma" | "oferta_favorito" | "combo_recorrente" | "cupom_retorno";
      justificativa: string;
    };
  };
};

export type DeliveryPerson = {
  id: number;
  nome: string;
  ativo: boolean;
};

export type OrderQuote = {
  itens: Array<{
    nome: string;
    preco: number;
    qtd: number;
    adicionais: OrderAdditional[];
    removidos: string[];
    obs: string;
    tipo: string;
  }>;
  complementosPedido: OrderComplement[];
  subtotal: number;
  taxaEntrega: number;
  total: number;
};
