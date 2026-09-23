import { promises as fs } from "fs";
import path from "path";
import { supabaseConfigured, supabaseServer } from "./supabase";

/*
  =====================================================================
  CAMADA DE DADOS (versão local)
  ---------------------------------------------------------------------
  Enquanto o site roda apenas localmente, os dados ficam em arquivos
  JSON dentro da pasta /data. Toda leitura/escrita passa por aqui.

  NA HOSPEDAGEM (Supabase ligado — ver src/lib/supabase.ts):
  - Rode /supabase/schema.sql no SQL Editor do projeto Supabase
  - Preencha NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
  - Cada coleção fica inteira (JSON) na tabela `collections`; o seed
    inicial é feito com `node scripts/seed-supabase.mjs`.
  Nenhuma outra parte do código precisa mudar: rotas e páginas só
  conhecem as funções exportadas aqui.
  =====================================================================
*/

const DATA_DIR = path.join(process.cwd(), "data");

// trava simples para evitar escritas concorrentes no mesmo arquivo
const locks = new Map<string, Promise<unknown>>();

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(key, next.catch(() => {}));
  return next;
}

export async function readCollection<T>(name: string): Promise<T[]> {
  if (supabaseConfigured()) {
    const { data, error } = await supabaseServer()
      .from("collections")
      .select("data")
      .eq("name", name)
      .maybeSingle();
    if (error) throw new Error(`Supabase (${name}): ${error.message}`);
    return ((data?.data as T[] | null) ?? []) as T[];
  }
  const file = path.join(DATA_DIR, `${name}.json`);
  try {
    const raw = await fs.readFile(file, "utf-8");
    // tolera BOM (arquivos salvos por editores/PowerShell no Windows)
    return JSON.parse(raw.replace(/^﻿/, "")) as T[];
  } catch {
    return [];
  }
}

export async function writeCollection<T>(name: string, rows: T[]): Promise<void> {
  if (supabaseConfigured()) {
    const { error } = await supabaseServer()
      .from("collections")
      .upsert({ name, data: rows, updated_at: new Date().toISOString() }, { onConflict: "name" });
    if (error) throw new Error(`Supabase (${name}): ${error.message}`);
    return;
  }
  const file = path.join(DATA_DIR, `${name}.json`);
  await withLock(name, async () => {
    // escrita atômica: grava em arquivo temporário e renomeia
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(rows, null, 2), "utf-8");
    await fs.rename(tmp, file);
  });
}

export function newId(prefix = ""): string {
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

/* ------------------------- Tipos do domínio ------------------------- */

export type Product = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  detalhe: string;
  preco: number;
  /** promoção: preço riscado = `preco`, valor cobrado = este (null = sem promoção) */
  precoPromocional?: number | null;
  categoria: string;
  imagem: string;
  ordem: number;
  estoque: number;
  ativo: boolean;
};

export type Categoria = {
  id: string;
  nome: string;
  ordem: number;
  /** visível no site: aparece no filtro/ícones e os produtos dela aparecem */
  ativo: boolean;
  /** ícone redondo da Home (opcional — sem imagem a categoria não vira ícone) */
  imagem: string;
};

export type Coupon = {
  id: string;
  codigo: string;
  tipo: "percentual" | "valor";
  valor: number;
  validade: string; // AAAA-MM-DD
  usoMaximo: number;
  usos: number;
  /** true = cada CPF só pode usar o cupom uma vez */
  umPorCpf?: boolean;
  ativo: boolean;
  criadoEm: string;
};

export type Post = {
  id: string;
  slug: string;
  titulo: string;
  capa: string;
  resumo: string;
  conteudo: string;
  destaque: boolean;
  ordem: number;
  ativo: boolean;
  criadoEm: string;
};

export type Slide = {
  id: string;
  imagem: string;
  titulo: string;
  frase: string;
  subtitulo: string;
  textoBotao: string;
  linkBotao: string;
  /* Tom por cima da foto: "vinho" (padrão), "marrom" ou "nenhum" (foto limpa) */
  overlay?: SlideOverlay;
  ordem: number;
  ativo: boolean;
};

export type SlideOverlay = "vinho" | "marrom" | "nenhum";

export type Testimonial = {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  telefone: string;
  texto: string;
  /** estrelas da avaliação no Google (1 a 5; ausente = 5) */
  nota?: number;
  aprovado: boolean;
  criadoEm: string;
};

export type OrderItem = {
  produtoId: string;
  nome: string;
  preco: number;
  quantidade: number;
};

export type Order = {
  id: string;
  itens: OrderItem[];
  subtotal: number;
  frete: number;
  desconto: number;
  total: number;
  cupom: string | null;
  cliente: {
    nome: string;
    sobrenome: string;
    email: string;
    cpf: string;
    telefone: string;
  };
  entrega: {
    tipo: "entrega" | "retirada";
    cep: string;
    endereco: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  pagamento: {
    metodo: "cartao" | "pix";
    status: "pendente" | "aprovado" | "recusado";
    /** txid da cobrança (ou endToEndId depois de pago); no modo simulado, PIX-SIM-... */
    referencia: string;
    /** Pix (C6): txid da cobrança, código copia-e-cola e validade */
    txid?: string;
    copiaECola?: string;
    expiraEm?: string;
    /** Cartão (C6 Checkout): crédito ou débito, id do checkout e link da página de pagamento do C6 */
    tipoCartao?: "credito" | "debito";
    checkoutId?: string;
    linkPagamento?: string;
    /** preenchido depois de pago: bandeira e últimos 4 dígitos (vem do C6, nunca o número inteiro) */
    cartaoBandeira?: string;
    cartaoFinal?: string;
  };
  status: "recebido" | "preparando" | "entregue" | "cancelado";
  criadoEm: string;
};

/* ----------------------- Status da loja (online) ----------------------- */

/*
  O Ricardo abre e fecha a loja pelo painel (como faz no iFood). Com a
  loja fechada o site continua no ar e o carrinho funciona, mas o
  checkout é bloqueado (aviso no site + trava na rota /api/checkout).
  `voltaAs` é o horário de volta mostrado ao cliente (ex.: "17:00").
*/
export type LojaStatus = {
  aberta: boolean;
  voltaAs: string;
};

type SettingsRow = {
  id: string;
  aberta?: boolean;
  voltaAs?: string;
  link?: string;
  nota?: number;
  total?: number;
  faixas?: FreteFaixa[];
};

/*
  Dados do perfil da Regadoces no Google (avaliações): o Ricardo copia
  do Google Business e cola no painel — link para avaliar, nota média
  e total de avaliações. Ficam na coleção `settings`, row "google".
*/
export type GoogleInfo = { link: string; nota: number; total: number };

export async function getGoogleInfo(): Promise<GoogleInfo> {
  const rows = await readCollection<SettingsRow>("settings");
  const r = rows.find((x) => x.id === "google");
  return { link: r?.link ?? "", nota: r?.nota ?? 5, total: r?.total ?? 0 };
}

export async function setGoogleInfo(info: GoogleInfo): Promise<void> {
  const rows = await readCollection<SettingsRow>("settings");
  const outros = rows.filter((x) => x.id !== "google");
  await writeCollection("settings", [...outros, { id: "google", ...info }]);
}

export async function getLojaStatus(): Promise<LojaStatus> {
  const rows = await readCollection<SettingsRow>("settings");
  const r = rows.find((x) => x.id === "loja");
  return { aberta: r?.aberta ?? true, voltaAs: r?.voltaAs ?? "" };
}

export async function setLojaStatus(status: LojaStatus): Promise<void> {
  const rows = await readCollection<SettingsRow>("settings");
  const outros = rows.filter((x) => x.id !== "loja");
  await writeCollection("settings", [...outros, { id: "loja", ...status }]);
}

/* ----------------------- Encomendas (painel) ----------------------- */

/*
  Os 4 itens de "O que você pode encomendar?" da página /encomendas.
  Editáveis no painel (pedido do Ricardo, 31/08): foto do card, textos e
  uma galeria LIVRE de fotos com legenda (quantas ele quiser). Cada item
  vira a página /encomendas/<id>. Sem row salva vale ENCOMENDAS_PADRAO.
*/
export type EncomendaFoto = {
  url: string;
  legenda: string;
  /** foto herdada do card do designer: recorte que só mostra o topo */
  recorteCard?: boolean;
};

export type EncomendaItem = {
  id: string;
  nome: string;
  /** frase curta do card em /encomendas */
  desc: string;
  cardFoto: string;
  /** subtítulo da página do item */
  resumo: string;
  fotos: EncomendaFoto[];
  /** linhas do quadro "Como funciona" */
  detalhes: string[];
  whatsappTexto: string;
  cardapio?: { href: string; label: string };
  ordem: number;
};

export const ENCOMENDAS_PADRAO: EncomendaItem[] = [
  {
    id: "reganaked-cake",
    nome: "RegaNaked Cake",
    desc: "Uma opção especial para ser o centro da sua celebração.",
    cardFoto: "/images/encomendas/card-reganaked.png",
    resumo:
      "O bolo em camadas à vista, com recheios generosos — escolha o tamanho, a massa e o recheio.",
    fotos: [
      { url: "/images/encomendas/reganaked-bolo.jpg", legenda: "RegaNaked Cake" },
    ],
    detalhes: [
      "11cm (4 pessoas, aprox. 760g) — R$ 160,00",
      "15cm (8/10 pessoas, aprox. 1,5kg) — R$ 220,00",
      "17cm (12/15 pessoas, aprox. 2,2kg) — R$ 250,00",
      "20cm (17/20 pessoas, aprox. 3kg) — R$ 300,00",
      "23cm (30/35 pessoas, aprox. 4kg) — R$ 395,00",
      "Massas: Branca, Chocolate, Red Velvet ou Black.",
      "Recheios: Biscoff*, Branco, Branco c/ Oreo*, Bueno*, Crocante Ovomaltine*, Doce de Leite, Limão, Geleia de Frutas Vermelhas, Goiabada, Meio Amargo, Nesquik, Nutella*, Paçoca, Pistache* ou Preto.",
      "* Recheios com valor adicional — consulte.",
    ],
    whatsappTexto: "Olá! Quero encomendar um RegaNaked Cake.",
    ordem: 1,
  },
  {
    id: "micro-brownies",
    nome: "Micro Brownies",
    desc: "Perfeitos para compor mesas, eventos e lembranças.",
    cardFoto: "/images/encomendas/card-mini-brownies.png",
    resumo:
      "Crocantes por fora e macios por dentro — perfeitos para compor mesas, eventos e lembranças.",
    fotos: [
      { url: "/images/products/083-micro-brownie-4cm-x-4cm.jpg", legenda: "Brownie preto" },
      { url: "/images/products/104-micro-brancawnie-4cm-x-4cm.jpg", legenda: "Brancawnie (brownie branco)" },
    ],
    detalhes: [
      "Encomendas a partir de 20 unidades.",
      "Tamanho: 4cm x 4cm — a medida ideal para mesas de festa.",
      "Brownie preto: a massa tradicional de chocolate.",
      "Brancawnie: o nosso brownie branco, feito com chocolate branco.",
    ],
    whatsappTexto: "Olá! Quero encomendar Micro Brownies para o meu evento.",
    cardapio: { href: "/produtos/brownie", label: "Ver brownies no cardápio" },
    ordem: 2,
  },
  {
    id: "micro-palha-italiana",
    nome: "Micro Palha Italiana",
    desc: "Uma opção prática e deliciosa para servir aos seus convidados.",
    cardFoto: "/images/encomendas/palha-card.jpg",
    resumo: "Uma opção prática e deliciosa para servir aos seus convidados.",
    fotos: [
      { url: "/images/encomendas/palha-embalada.jpg", legenda: "Embaladas individualmente" },
      { url: "/images/encomendas/palha-pote.jpg", legenda: "Micro Palha Italiana" },
      { url: "/images/encomendas/palha-mordida.jpg", legenda: "O recheio por dentro" },
    ],
    detalhes: [
      "Encomendas a partir de 20 unidades.",
      "No tamanho micro, ideal para compor mesas de festas e eventos.",
      "Cada unidade embalada individualmente, com o selo Regadoces.",
      "Fale com a gente para conhecer os sabores e valores disponíveis.",
    ],
    whatsappTexto: "Olá! Quero encomendar Micro Palhas Italianas para o meu evento.",
    ordem: 3,
  },
  {
    id: "brigadeiro-de-colher",
    nome: "Brigadeiro de Colher",
    desc: "Uma escolha para quem quer incluir diferentes sabores na experiência.",
    cardFoto: "/images/encomendas/card-brigadeiro-colher.png",
    resumo: "Uma escolha para quem quer incluir diferentes sabores na experiência.",
    fotos: [
      {
        url: "/images/encomendas/card-brigadeiro-colher.png",
        legenda: "Brigadeiro de Colher",
        recorteCard: true,
      },
    ],
    detalhes: [
      "Disponível em diferentes sabores.",
      "Perfeito para mesas de festa, eventos e lembranças.",
      "Fale com a gente para montar a quantidade ideal para o seu evento.",
    ],
    whatsappTexto: "Olá! Quero encomendar Brigadeiro de Colher para o meu evento.",
    ordem: 4,
  },
];

export async function getEncomendas(): Promise<EncomendaItem[]> {
  const rows = await readCollection<EncomendaItem>("encomendas");
  if (rows.length === 0) return ENCOMENDAS_PADRAO;
  return [...rows].sort((a, b) => a.ordem - b.ordem);
}

export async function getEncomenda(id: string): Promise<EncomendaItem | null> {
  const rows = await getEncomendas();
  return rows.find((e) => e.id === id) ?? null;
}

/** Semeia a coleção com o padrão na primeira visita do painel. */
export async function seedEncomendas(): Promise<EncomendaItem[]> {
  const rows = await readCollection<EncomendaItem>("encomendas");
  if (rows.length > 0) return [...rows].sort((a, b) => a.ordem - b.ordem);
  await writeCollection("encomendas", ENCOMENDAS_PADRAO);
  return ENCOMENDAS_PADRAO;
}

export async function updateEncomenda(item: EncomendaItem): Promise<void> {
  const rows = await seedEncomendas();
  const outros = rows.filter((e) => e.id !== item.id);
  await writeCollection("encomendas", [...outros, item]);
}

/* ----------------------- Página Sobre nós (painel) ----------------------- */

/*
  Textos e fotos editáveis da página /sobre (pedido do Ricardo, 31/08):
  parágrafos do hero, seção "O que fazemos" (título/texto/botão + as 4
  tiras de foto que abrem no hover), "Eventos e festas" e "Feito por
  pessoas" (foto da cozinha + textos + botão). As 2 fotos do hero ficam
  fixas (combinado). Títulos aceitam quebra de linha com Enter.
*/
export type SobreConteudo = {
  id: string;
  heroParagrafos: string[];
  fazemosTitulo: string;
  fazemosTexto: string;
  fazemosBotao: string;
  tiras: string[];
  eventosTitulo: string;
  eventosTexto1: string;
  eventosTexto2: string;
  cozinhaFoto: string;
  cozinhaTitulo: string;
  cozinhaParagrafos: string[];
  cozinhaBotao: string;
};

export const SOBRE_PADRAO: SobreConteudo = {
  id: "sobre",
  heroParagrafos: [
    "A Regadoces nasceu em 2019 com um propósito simples: despertar memórias e criar novos momentos através do sabor.",
    "Desde então, nossa confeitaria cresceu sem deixar de lado aquilo que nos trouxe até aqui: cuidado no preparo, receitas marcantes e doces feitos para dar vontade de repetir.",
    "Desde a nossa inauguração trabalhamos incessantemente para expandir a oferta de produtos e tornar a experiência do cliente a melhor possível. Temos orgulho da nossa jornada e queremos continuar melhorando a cada dia.",
    "Nossos produtos são cuidadosamente testados e selecionados para vocês. Navegue pelo nosso cardápio e experimente comprar no Regadoces.",
  ],
  fazemosTitulo: "Tem um Regadoces\npara cada momento.",
  fazemosTexto:
    "Bolos, tortas, brownies, pavês, pudins, brigadeiros e outras sobremesas fazem parte do nosso cardápio. Selecionamos cada produto pensando em entregar sabor, qualidade e uma experiência especial, seja para adoçar um dia comum, presentear alguém ou dividir à mesa.",
  fazemosBotao: "CONHECER NOSSO CARDÁPIO",
  tiras: [
    "/images/sobre/momento-1.png",
    "/images/sobre/momento-2.png",
    "/images/sobre/momento-3.png",
    "/images/sobre/momento-4.png",
  ],
  eventosTitulo: "Fazemos parte dos seus\neventos e festas.",
  eventosTexto1: "Alguns momentos pedem algo feito\nespecialmente para eles.",
  eventosTexto2:
    "Por isso, além do nosso e-commerce, trabalhamos com encomendas selecionadas para festas, eventos e comemorações, levando o sabor da Regadoces para momentos que merecem ser lembrados.",
  cozinhaFoto: "/images/sobre/cozinha-2.jpg",
  cozinhaTitulo: "Feito por pessoas. Para pessoas.",
  cozinhaParagrafos: [
    "Por trás de cada Regadoces existe quem acredita que um bom doce vai muito além da receita.",
    "Existe cuidado na escolha, no preparo e em cada detalhe até chegar à sua mesa.",
    "É assim que queremos continuar crescendo: criando doces que aproximam pessoas, participam de histórias e deixam aquele gostinho de “quero mais”.",
  ],
  cozinhaBotao: "CONHECER NOSSO CARDÁPIO",
};

export async function getSobre(): Promise<SobreConteudo> {
  const rows = await readCollection<SobreConteudo>("sobre");
  return rows.find((r) => r.id === "sobre") ?? SOBRE_PADRAO;
}

export async function setSobre(conteudo: SobreConteudo): Promise<void> {
  await writeCollection("sobre", [{ ...conteudo, id: "sobre" }]);
}

/* ----------------------- Topo da página Encomendas (painel) ----------------------- */

/*
  Foto grande, título e texto do topo de /encomendas — o Ricardo pediu
  (02/09) para poder trocar um dia. Fica na coleção `encomendas_topo`,
  row "topo"; sem row salva vale o padrão da LP. Título aceita Enter
  (vira quebra de linha só no desktop, como na LP).
*/
export type EncomendasTopo = {
  id: string;
  foto: string;
  titulo: string;
  texto: string;
};

export const ENCOMENDAS_TOPO_PADRAO: EncomendasTopo = {
  id: "topo",
  foto: "/images/hero/mesa-eventos.jpg",
  titulo: "Regadoces preparados para tornar\nsua comemoração ainda mais especial.",
  texto:
    "Regadoces preparados para tornar sua comemoração ainda mais especial. Conte com opções para diferentes ocasiões e fale diretamente conosco para entender as possibilidades da sua encomenda.",
};

export async function getEncomendasTopo(): Promise<EncomendasTopo> {
  const rows = await readCollection<EncomendasTopo>("encomendas_topo");
  return rows.find((r) => r.id === "topo") ?? ENCOMENDAS_TOPO_PADRAO;
}

export async function setEncomendasTopo(topo: EncomendasTopo): Promise<void> {
  await writeCollection("encomendas_topo", [{ ...topo, id: "topo" }]);
}

/* ----------------------- FAQ da Home (painel) ----------------------- */

/*
  Perguntas frequentes da Home, editáveis no painel (pedido do Ricardo,
  02/09). Coleção `faq`; se estiver vazia vale o padrão da LP (e o painel
  semeia na primeira visita, igual às encomendas).
*/
export type FaqItem = {
  id: string;
  pergunta: string;
  resposta: string;
  ordem: number;
  ativo: boolean;
};

export const FAQ_PADRAO: FaqItem[] = [
  { id: "f1", pergunta: "Como faço um pedido?", resposta: "Escolha seus produtos, adicione ao carrinho e finalize a compra diretamente pelo site.", ordem: 1, ativo: true },
  { id: "f2", pergunta: "Vocês fazem entregas?", resposta: "Consulte seu endereço ou CEP durante a compra para verificar as opções disponíveis.", ordem: 2, ativo: true },
  { id: "f3", pergunta: "Posso retirar meu pedido?", resposta: "Quando disponível, a opção de retirada aparecerá durante a finalização da compra.", ordem: 3, ativo: true },
  { id: "f4", pergunta: "Quais formas de pagamento vocês aceitam?", resposta: "As opções disponíveis são apresentadas no checkout.", ordem: 4, ativo: true },
  { id: "f5", pergunta: "Como funcionam as encomendas?", resposta: "As encomendas são destinadas a festas, eventos e comemorações e possuem disponibilidade limitada. Acesse nossa página de Encomendas para conhecer as opções e solicitar atendimento.", ordem: 5, ativo: true },
  { id: "f6", pergunta: "Com quanto tempo de antecedência devo fazer uma encomenda?", resposta: "As encomendas são destinadas a festas, eventos e comemorações e possuem disponibilidade limitada. Acesse nossa página de Encomendas para conhecer as opções e solicitar atendimento.", ordem: 6, ativo: true },
  { id: "f7", pergunta: "Consigo alterar meu pedido depois da compra?", resposta: "Entre em contato com nossa equipe o quanto antes. Alterações dependem do estágio de preparação do pedido.", ordem: 7, ativo: true },
];

export async function getFaq(): Promise<FaqItem[]> {
  const rows = await readCollection<FaqItem>("faq");
  const lista = rows.length > 0 ? rows : FAQ_PADRAO;
  return [...lista].sort((a, b) => a.ordem - b.ordem);
}

/** Semeia a coleção com o padrão na primeira visita do painel. */
export async function seedFaq(): Promise<FaqItem[]> {
  const rows = await readCollection<FaqItem>("faq");
  if (rows.length > 0) return [...rows].sort((a, b) => a.ordem - b.ordem);
  await writeCollection("faq", FAQ_PADRAO);
  return FAQ_PADRAO;
}

/* ----------------------- Tabela de frete (painel) ----------------------- */

/*
  O Ricardo edita os preços do motoboy pelo painel (se Uber/99 subirem,
  ele ajusta sozinho). Cada faixa é "até X km custa R$ Y e leva ~Z min";
  a última faixa define o alcance máximo da entrega. Fica na coleção
  `settings`, row "frete"; sem row salva vale FRETE_PADRAO (tabela
  original passada pelo Ricardo).
*/
export type FreteFaixa = { ateKm: number; valor: number; minutos: number };

export const FRETE_PADRAO: FreteFaixa[] = [
  { ateKm: 1, valor: 5, minutos: 11 },
  { ateKm: 2, valor: 7, minutos: 14 },
  { ateKm: 3, valor: 9, minutos: 17 },
  { ateKm: 4, valor: 11, minutos: 19 },
  { ateKm: 5, valor: 13, minutos: 22 },
  { ateKm: 6, valor: 15, minutos: 26 },
  { ateKm: 7, valor: 17, minutos: 29 },
  { ateKm: 8, valor: 19, minutos: 31 },
  { ateKm: 9, valor: 21, minutos: 34 },
  { ateKm: 10, valor: 22, minutos: 36 },
  { ateKm: 11, valor: 23, minutos: 39 },
  { ateKm: 12, valor: 24, minutos: 42 },
  { ateKm: 13, valor: 25, minutos: 44 },
  { ateKm: 14, valor: 26, minutos: 47 },
  { ateKm: 15, valor: 27, minutos: 50 },
];

export async function getFreteTabela(): Promise<FreteFaixa[]> {
  const rows = await readCollection<SettingsRow>("settings");
  const r = rows.find((x) => x.id === "frete");
  const faixas = r?.faixas;
  if (!Array.isArray(faixas) || faixas.length === 0) return FRETE_PADRAO;
  return [...faixas].sort((a, b) => a.ateKm - b.ateKm);
}

export async function setFreteTabela(faixas: FreteFaixa[]): Promise<void> {
  const rows = await readCollection<SettingsRow>("settings");
  const outros = rows.filter((x) => x.id !== "frete");
  await writeCollection("settings", [...outros, { id: "frete", faixas }]);
}

/* ----------------------- Categorias (painel) ----------------------- */

/*
  As categorias agora são editáveis pelo painel (criar, renomear, ordenar
  e ocultar). Antes eram fixas no código; esta lista padrão é usada como
  "semente" na primeira visita do admin e como fallback enquanto a
  coleção `categories` estiver vazia.
*/
export const CATEGORIAS_PADRAO: Omit<Categoria, "id">[] = [
  { nome: "Torta", ordem: 1, ativo: true, imagem: "/images/categories/torta.jpg" },
  { nome: "Bolo", ordem: 2, ativo: true, imagem: "/images/categories/bolo.jpg" },
  { nome: "Brownie", ordem: 3, ativo: true, imagem: "/images/categories/brownie.jpg" },
  { nome: "Brigadeiro", ordem: 4, ativo: true, imagem: "/images/categories/brigadeiro.jpg" },
  { nome: "Brigadeirão", ordem: 5, ativo: true, imagem: "/images/categories/brigadeirao.jpg" },
  { nome: "Pudim/Sorvete", ordem: 6, ativo: true, imagem: "/images/categories/pudim-sorvete.jpg" },
  { nome: "Pavê", ordem: 7, ativo: true, imagem: "/images/categories/pave.jpg" },
  { nome: "Mousse", ordem: 8, ativo: true, imagem: "/images/categories/mousse.jpg" },
  { nome: "Cocada", ordem: 9, ativo: true, imagem: "" },
  { nome: "Encomendas", ordem: 10, ativo: true, imagem: "" },
  { nome: "Páscoa", ordem: 11, ativo: true, imagem: "" },
  { nome: "Bebidas", ordem: 12, ativo: true, imagem: "/images/categories/bebidas.jpg" },
  { nome: "Extras", ordem: 13, ativo: true, imagem: "" },
];

function categoriasPadraoComId(): Categoria[] {
  return CATEGORIAS_PADRAO.map((c, i) => ({ id: `cat${i + 1}`, ...c }));
}

/** Todas as categorias (visão do admin), ordenadas. Fallback = padrão. */
export async function getCategorias(): Promise<Categoria[]> {
  const rows = await readCollection<Categoria>("categories");
  if (rows.length === 0) return categoriasPadraoComId();
  return rows.sort((a, b) => a.ordem - b.ordem);
}

/** Grava a lista padrão se a coleção ainda estiver vazia (1º uso do painel). */
export async function seedCategoriasSePreciso(): Promise<Categoria[]> {
  const rows = await readCollection<Categoria>("categories");
  if (rows.length > 0) return rows.sort((a, b) => a.ordem - b.ordem);
  const seed = categoriasPadraoComId();
  await writeCollection("categories", seed);
  return seed;
}

/** Categorias visíveis no site (ativo), ordenadas. */
export async function getCategoriasPublicas(): Promise<Categoria[]> {
  return (await getCategorias()).filter((c) => c.ativo);
}

/* -------------------- Helpers de produto (públicos) -------------------- */

/**
 * Produtos visíveis para o CLIENTE: apenas ativos, com estoque > 0 e
 * de categoria visível (categoria oculta no painel esconde os produtos
 * dela do site inteiro — ex.: Páscoa fora de época).
 */
export async function getPublicProducts(): Promise<Product[]> {
  const [all, categorias] = await Promise.all([
    readCollection<Product>("products"),
    getCategorias(),
  ]);
  const ocultas = new Set(
    categorias.filter((c) => !c.ativo).map((c) => c.nome.toLowerCase())
  );
  return all
    .filter(
      (p) => p.ativo && p.estoque > 0 && !ocultas.has(p.categoria.toLowerCase())
    )
    .sort((a, b) => a.ordem - b.ordem);
}

export async function getAllProducts(): Promise<Product[]> {
  const all = await readCollection<Product>("products");
  return all.sort((a, b) => a.ordem - b.ordem);
}
