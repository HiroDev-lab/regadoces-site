import https from "https";
import { readFileSync } from "fs";

/*
  =====================================================================
  INTEGRAÇÃO C6 BANK — PIX (API Pix padrão Banco Central, versão C6)
  ---------------------------------------------------------------------
  Documentação: https://developers.c6bank.com.br/apis/pix e /apis/auth
  Ambientes:
    sandbox   https://baas-api-sandbox.c6bank.info   (seg–sex, 7h–22h)
    produção  https://baas-api.c6bank.info           (após homologação)

  Variáveis de ambiente (ver .env.example):
    C6_BASE_URL         (vazio = sandbox)
    C6_CLIENT_ID / C6_CLIENT_SECRET   credenciais OAuth2
    C6_PIX_KEY          chave Pix (DICT) que recebe as cobranças
    C6_CERT_PATH / C6_CERT_KEY_PATH   certificado mTLS (.pem) + chave privada

  Fluxo:
    1. token OAuth2 (client_credentials + mTLS), válido 10 min (cache aqui)
    2. POST /v2/pix/cob → cobrança imediata; resposta traz txid e o
       "Pix copia e cola" (pixCopiaECola), que também vira o QR code
    3. o cliente paga; o C6 chama nosso webhook (/api/webhooks/c6) e o
       pedido é confirmado depois de conferir GET /v2/pix/cob/{txid}
       (status CONCLUIDA). A página do pedido também consulta sozinha.

  Sem as variáveis acima, tudo roda em modo SIMULADO (desenvolvimento).

  Cartão (crédito/débito): API de CHECKOUT do C6 = link de pagamento
  (ver bloco "CARTÃO" no fim do arquivo). O cliente digita o cartão na
  página do C6; dados de cartão NUNCA passam pelo site. Só fica ligado
  com NEXT_PUBLIC_PAGAMENTO_CARTAO=1 (depois da homologação do Checkout).

  DUAS CHAVES DE API (produção, desde 18/09/2026): o Web Banking do C6
  gerou uma chave só com permissão PIX (03/09) e outra só com CHECKOUT
  (18/09). Por isso o Checkout pode usar credenciais próprias:
    C6_CHECKOUT_CLIENT_ID / C6_CHECKOUT_CLIENT_SECRET
    C6_CHECKOUT_CERT_PATH / C6_CHECKOUT_CERT_KEY_PATH
  Vazias = o Checkout usa as mesmas credenciais do Pix (uma chave com as
  duas permissões).
  =====================================================================
*/

export type PixChargeResult = {
  status: "aprovado" | "pendente";
  /** identificador guardado no pedido (txid no C6; PIX-SIM-... no modo simulado) */
  referencia: string;
  copiaECola: string;
  txid?: string;
  expiraEm?: string; // ISO
};

export type PixCobStatus = "ATIVA" | "CONCLUIDA" | "REMOVIDA_PELO_USUARIO_RECEBEDOR" | "REMOVIDA_PELO_PSP" | string;

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** true quando as credenciais + certificado do C6 estão configurados */
export function c6Configured(): boolean {
  return Boolean(
    env("C6_CLIENT_ID") &&
      env("C6_CLIENT_SECRET") &&
      env("C6_PIX_KEY") &&
      env("C6_CERT_PATH") &&
      env("C6_CERT_KEY_PATH")
  );
}

/**
 * Cartão (crédito/débito) fica disponível quando:
 *  - modo simulado (local, sem credenciais do C6), ou
 *  - C6 configurado E a API de Checkout liberada nas credenciais
 *    (NEXT_PUBLIC_PAGAMENTO_CARTAO=1 — ligar só depois da homologação
 *    da API de Checkout e das permissões CHECKOUT no Web Banking).
 * NEXT_PUBLIC_PAGAMENTO_CARTAO=0 desliga em qualquer caso.
 */
export function cartaoDisponivel(): boolean {
  const flag = env("NEXT_PUBLIC_PAGAMENTO_CARTAO");
  if (flag === "0") return false;
  if (!c6Configured()) return true; // simulado
  return flag === "1";
}

/* ------------------------------ credenciais ------------------------------ */

/** Qual chave de API usar: "pix" (C6_*) ou "checkout" (C6_CHECKOUT_*, se definidas). */
export type ServicoC6 = "pix" | "checkout";

function credenciais(servico: ServicoC6) {
  if (servico === "checkout" && env("C6_CHECKOUT_CLIENT_ID")) {
    return {
      clientId: env("C6_CHECKOUT_CLIENT_ID"),
      clientSecret: env("C6_CHECKOUT_CLIENT_SECRET") || env("C6_CLIENT_SECRET"),
      certPath: env("C6_CHECKOUT_CERT_PATH") || env("C6_CERT_PATH"),
      keyPath: env("C6_CHECKOUT_CERT_KEY_PATH") || env("C6_CERT_KEY_PATH"),
    };
  }
  return {
    clientId: env("C6_CLIENT_ID"),
    clientSecret: env("C6_CLIENT_SECRET"),
    certPath: env("C6_CERT_PATH"),
    keyPath: env("C6_CERT_KEY_PATH"),
  };
}

/* ------------------------------ HTTP mTLS ------------------------------ */

const certCache = new Map<string, { cert: Buffer; key: Buffer }>();
function certs(servico: ServicoC6) {
  const { certPath, keyPath } = credenciais(servico);
  const chave = `${certPath}|${keyPath}`;
  let c = certCache.get(chave);
  if (!c) {
    c = { cert: readFileSync(certPath), key: readFileSync(keyPath) };
    certCache.set(chave, c);
  }
  return c;
}

function baseUrl(): URL {
  return new URL(env("C6_BASE_URL") || "https://baas-api-sandbox.c6bank.info");
}

type Resp = { status: number; body: string };

function request(
  servico: ServicoC6,
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: string
): Promise<Resp> {
  const { cert, key } = certs(servico);
  const base = baseUrl();
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: base.hostname,
        port: base.port || 443,
        path,
        method,
        cert,
        key,
        timeout: 25000,
        headers: {
          ...headers,
          ...(body ? { "Content-Length": String(Buffer.byteLength(body)) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error("C6: tempo esgotado"));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function parse<T>(r: Resp, contexto: string): T {
  if (r.status < 200 || r.status >= 300) {
    throw new Error(`C6 ${contexto}: HTTP ${r.status} ${r.body.slice(0, 300)}`);
  }
  try {
    return JSON.parse(r.body) as T;
  } catch {
    throw new Error(`C6 ${contexto}: resposta inválida`);
  }
}

/* ------------------------------ OAuth2 ------------------------------ */

// um token por chave de API (Pix e Checkout podem ser chaves diferentes)
const tokenCache = new Map<ServicoC6, { token: string; exp: number }>();

export async function getAccessToken(servico: ServicoC6 = "pix"): Promise<string> {
  const emCache = tokenCache.get(servico);
  if (emCache && Date.now() < emCache.exp) return emCache.token;
  const { clientId, clientSecret } = credenciais(servico);
  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  }).toString();
  const r = await request(servico, "POST", "/v1/auth/", { "Content-Type": "application/x-www-form-urlencoded" }, form);
  const j = parse<{ access_token: string; expires_in?: number }>(r, `auth (${servico})`);
  // renova 60s antes de expirar (padrão 600s)
  tokenCache.set(servico, { token: j.access_token, exp: Date.now() + ((j.expires_in ?? 600) - 60) * 1000 });
  return j.access_token;
}

async function auth(servico: ServicoC6): Promise<Record<string, string>> {
  return { Authorization: `Bearer ${await getAccessToken(servico)}` };
}

/* ------------------------------ PIX ------------------------------ */

type CobResposta = {
  txid: string;
  status: PixCobStatus;
  pixCopiaECola?: string;
  location?: string;
  calendario?: { criacao?: string; expiracao?: number };
  pix?: { endToEndId?: string; valor?: string; horario?: string }[];
};

export async function createPixCharge(
  valorCentavos: number,
  pedidoId: string,
  devedor?: { nome: string; cpf: string }
): Promise<PixChargeResult> {
  if (!c6Configured()) {
    // ------- SIMULAÇÃO LOCAL (sem credenciais do C6) -------
    return {
      status: "aprovado",
      referencia: `PIX-SIM-${pedidoId}`,
      copiaECola: `00020126580014BR.GOV.BCB.PIX-SIMULADO-${pedidoId}-${valorCentavos}`,
    };
  }

  const expiracao = 3600; // 1 hora para pagar
  const cpf = devedor?.cpf.replace(/\D/g, "");
  const corpo = JSON.stringify({
    calendario: { expiracao },
    valor: { original: (valorCentavos / 100).toFixed(2) },
    chave: env("C6_PIX_KEY"),
    solicitacaoPagador: `Regadoces - pedido ${pedidoId}`.slice(0, 140),
    ...(devedor && cpf && cpf.length === 11 ? { devedor: { nome: devedor.nome.slice(0, 200), cpf } } : {}),
  });
  const r = await request("pix", "POST", "/v2/pix/cob", { "Content-Type": "application/json", ...(await auth("pix")) }, corpo);
  const cob = parse<CobResposta>(r, "criar cobrança");
  if (!cob.txid || !cob.pixCopiaECola) {
    throw new Error("C6: cobrança criada sem txid/pixCopiaECola");
  }
  const criacao = cob.calendario?.criacao ? new Date(cob.calendario.criacao) : new Date();
  return {
    status: cob.status === "CONCLUIDA" ? "aprovado" : "pendente",
    referencia: cob.txid,
    txid: cob.txid,
    copiaECola: cob.pixCopiaECola,
    expiraEm: new Date(criacao.getTime() + (cob.calendario?.expiracao ?? expiracao) * 1000).toISOString(),
  };
}

/** Consulta a cobrança no C6. Retorna o status e, se paga, o endToEndId. */
export async function consultarCobranca(txid: string): Promise<{ status: PixCobStatus; endToEndId?: string }> {
  const r = await request("pix", "GET", `/v2/pix/cob/${encodeURIComponent(txid)}`, await auth("pix"));
  const cob = parse<CobResposta>(r, "consultar cobrança");
  return { status: cob.status, endToEndId: cob.pix?.[0]?.endToEndId };
}

/** Cadastra (ou troca) a URL que o C6 chama quando um Pix é recebido. */
export async function registrarWebhook(webhookUrl: string): Promise<void> {
  const chave = encodeURIComponent(env("C6_PIX_KEY"));
  const r = await request(
    "pix",
    "PUT",
    `/v2/pix/webhook/${chave}`,
    { "Content-Type": "application/json", ...(await auth("pix")) },
    JSON.stringify({ webhookUrl })
  );
  if (r.status < 200 || r.status >= 300) {
    throw new Error(`C6 webhook: HTTP ${r.status} ${r.body.slice(0, 300)}`);
  }
}

export async function consultarWebhook(): Promise<string> {
  const chave = encodeURIComponent(env("C6_PIX_KEY"));
  const r = await request("pix", "GET", `/v2/pix/webhook/${chave}`, await auth("pix"));
  return `${r.status} ${r.body.slice(0, 500)}`;
}

/* ------------------------------ CARTÃO (API Checkout) ------------------------------ */

/*
  Cartão de crédito/débito = "link de pagamento" da API de Checkout do C6
  (https://developers.c6bank.com.br/apis/checkout):
    POST /v1/checkouts/  → { id, url }   (o cliente é levado para a página
                                          segura do C6, digita o cartão LÁ)
    GET  /v1/checkouts/{id} → status: CREATED | IN PROGRESS | PAID | DECLINED |
                              EXPIRED | CANCELLED | ERROR ...
  Quando o cliente paga, o C6 chama nosso webhook (service CHECKOUT) e
  redireciona o cliente de volta para a página do pedido (redirect_url).
  Os dados do cartão NUNCA passam pelo nosso servidor.
  Limites da API: valor mínimo R$ 5,00; external_reference_id com no máximo
  10 caracteres alfanuméricos; tipo CREDIT ou DEBIT escolhido na criação.
*/

export const CHECKOUT_VALOR_MINIMO_CENTAVOS = 500;

export type TipoCartao = "credito" | "debito";

export type CheckoutLinkInput = {
  valorCentavos: number;
  pedidoId: string;
  tipo: TipoCartao;
  descricao: string;
  redirectUrl: string;
  pagador?: { nome: string; cpf: string; email: string; telefone: string };
};

export type CheckoutLinkResult = {
  status: "aprovado" | "pendente";
  /** id do checkout no C6 (referência guardada no pedido; CHECKOUT-SIM-... no modo simulado) */
  referencia: string;
  checkoutId?: string;
  /** página de pagamento do C6 para onde o cliente é enviado */
  url: string;
  expiraEm?: string;
};

export type CheckoutStatus =
  | "CREATED"
  | "IN PROGRESS"
  | "AUTHORIZED, CONFIRMATION PENDING"
  | "CONFIRMATION REQUESTED"
  | "PAID"
  | "CANCELLATION REQUESTED"
  | "CANCELLED"
  | "DECLINED"
  | "EXPIRED"
  | "ERROR"
  | string;

const HEADERS_PARCEIRO = {
  "partner-software-name": "Loja online Regadoces",
  "partner-software-version": "1.0.0",
};

/** Referência curta para o C6 (máx. 10 caracteres alfanuméricos, única por pedido). */
export function referenciaCurta(pedidoId: string): string {
  const limpo = pedidoId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return limpo.slice(-10) || Date.now().toString(36).toUpperCase().slice(-10);
}

export async function createCheckoutLink(input: CheckoutLinkInput): Promise<CheckoutLinkResult> {
  if (!c6Configured()) {
    // ------- SIMULAÇÃO LOCAL: sem C6, o "link" é a própria página do pedido e já sai pago -------
    return {
      status: "aprovado",
      referencia: `CHECKOUT-SIM-${input.pedidoId}`,
      url: input.redirectUrl,
    };
  }
  if (input.valorCentavos < CHECKOUT_VALOR_MINIMO_CENTAVOS) {
    throw new Error("C6 checkout: valor abaixo do mínimo de R$ 5,00");
  }
  const cpf = (input.pagador?.cpf ?? "").replace(/\D/g, "");
  const telefone = (input.pagador?.telefone ?? "").replace(/\D/g, "").slice(-11);
  const email = (input.pagador?.email ?? "").trim();
  const pagador =
    input.pagador && cpf.length === 11
      ? {
          payer: {
            name: input.pagador.nome.trim().slice(0, 100),
            tax_id: cpf,
            ...(email && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) ? { email: email.slice(0, 150) } : {}),
            ...(telefone.length >= 10 ? { phone_number: telefone } : {}),
          },
        }
      : {};
  const corpo = JSON.stringify({
    amount: Number((input.valorCentavos / 100).toFixed(2)),
    description: input.descricao.slice(0, 200),
    external_reference_id: referenciaCurta(input.pedidoId),
    redirect_url: input.redirectUrl.slice(0, 300),
    ...pagador,
    payment: {
      card: {
        type: input.tipo === "debito" ? "DEBIT" : "CREDIT",
        installments: 1, // sem parcelamento (pedido do Ricardo)
        fixed_installments: true,
        authenticate: "NOT_REQUIRED",
        capture: true,
      },
    },
  });
  const r = await request(
    "checkout",
    "POST",
    "/v1/checkouts/",
    { "Content-Type": "application/json", ...HEADERS_PARCEIRO, ...(await auth("checkout")) },
    corpo
  );
  const j = parse<{ id?: string; url?: string }>(r, "criar checkout");
  if (!j.id || !j.url) throw new Error("C6: checkout criado sem id/url");
  return {
    status: "pendente",
    referencia: j.id,
    checkoutId: j.id,
    url: j.url,
    // o C6 expira o checkout em 7 dias; a loja considera 24h para o cliente voltar e pagar
    expiraEm: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  };
}

/** Consulta o checkout no C6 (usado pelo webhook e pela página do pedido). */
export async function consultarCheckout(
  checkoutId: string
): Promise<{ status: CheckoutStatus; pagoEm?: string; cartao?: { bandeira?: string; final?: string } }> {
  const r = await request(
    "checkout",
    "GET",
    `/v1/checkouts/${encodeURIComponent(checkoutId)}`,
    { ...HEADERS_PARCEIRO, ...(await auth("checkout")) }
  );
  const j = parse<{
    status?: string;
    payment_date_time?: string;
    payment?: { card?: { card_info?: { brand?: string; number?: string } } };
  }>(r, "consultar checkout");
  const info = j.payment?.card?.card_info;
  return {
    status: String(j.status ?? ""),
    pagoEm: j.payment_date_time,
    cartao: info ? { bandeira: info.brand, final: info.number?.slice(-4) } : undefined,
  };
}

/** Cancela um checkout ainda não pago (204 = ok). */
export async function cancelarCheckout(checkoutId: string): Promise<void> {
  const r = await request(
    "checkout",
    "PUT",
    `/v1/checkouts/${encodeURIComponent(checkoutId)}/cancel`,
    { ...HEADERS_PARCEIRO, ...(await auth("checkout")) }
  );
  if (r.status < 200 || r.status >= 300) {
    throw new Error(`C6 cancelar checkout: HTTP ${r.status} ${r.body.slice(0, 300)}`);
  }
}

/** Cadastra a URL que o C6 chama nos eventos de checkout (CREATED/PAID/DECLINED/EXPIRED...). */
export async function registrarWebhookCheckout(webhookUrl: string): Promise<void> {
  const r = await request(
    "checkout",
    "POST",
    "/v1/webhooks/",
    { "Content-Type": "application/json", ...HEADERS_PARCEIRO, ...(await auth("checkout")) },
    JSON.stringify({ url: webhookUrl, service: "CHECKOUT" })
  );
  if (r.status < 200 || r.status >= 300) {
    throw new Error(`C6 webhook checkout: HTTP ${r.status} ${r.body.slice(0, 300)}`);
  }
}

/** Status terminal que significa "não vai ser pago" (o cliente precisa fazer outro pedido). */
export function checkoutFalhou(status: CheckoutStatus): boolean {
  return ["CANCELLED", "DECLINED", "EXPIRED", "ERROR"].includes(status);
}
