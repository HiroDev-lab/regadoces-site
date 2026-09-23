// Executa, no sandbox do C6, os testes da API de CHECKOUT do "Roteiro de Testes"
// e grava as evidências (status + response body) em JSON para o roteiro.
//   AT_01    POST /v1/auth/                      (token)
//   C_01     POST /v1/checkouts/                 (criar link de pagamento: cartão crédito/débito + Pix)
//   C_02     GET  /v1/checkouts/{id}             (consultar)
//   C_04     POST /v1/webhooks/  service=CHECKOUT (cadastrar webhook)  + GET p/ conferir
//   C_03     PUT  /v1/checkouts/{id}/cancel      (cancelar — usa um 2º checkout, p/ manter o 1º vivo p/ pagamento)
// Uso: (com C6_* no ambiente)  node scripts/c6-evidencias-checkout.mjs [saida.json] [urlWebhook]
import https from "node:https";
import { readFileSync, writeFileSync } from "node:fs";

const env = (n) => (process.env[n] ?? "").trim();
const base = new URL(env("C6_BASE_URL") || "https://baas-api-sandbox.c6bank.info");
const cert = readFileSync(env("C6_CERT_PATH")), key = readFileSync(env("C6_CERT_KEY_PATH"));
const saida = process.argv[2] || "c6-evidencias-checkout.json";
const webhookUrl = process.argv[3] || "https://regadoces.com.br/api/webhooks/c6";

function call(method, path, headers = {}, body) {
  return new Promise((ok, err) => {
    const r = https.request({ host: base.hostname, path, method, cert, key, timeout: 25000,
      headers: { ...headers, ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}) } },
      (res) => { let d = ""; res.on("data", (c) => (d += c)).on("end", () => ok({ status: res.statusCode, body: d })); });
    r.on("error", err); r.on("timeout", () => { r.destroy(); err(new Error("timeout")); });
    if (body) r.write(body); r.end();
  });
}
const pretty = (b) => { try { return JSON.stringify(JSON.parse(b), null, 2); } catch { return b.slice(0, 2000) || "(sem corpo)"; } };
const ev = {};
const registra = (id, titulo, req, r) => { ev[id] = { titulo, request: req, status: r.status, body: pretty(r.body), ok: r.status >= 200 && r.status < 300, quando: new Date().toISOString() }; console.log(`${ev[id].ok ? "✓" : "x"} ${id} ${titulo} → HTTP ${r.status}`); };
const J = { "Content-Type": "application/json", "partner-software-name": "Loja online Regadoces", "partner-software-version": "1.0.0" };

const form = new URLSearchParams({ client_id: env("C6_CLIENT_ID"), client_secret: env("C6_CLIENT_SECRET"), grant_type: "client_credentials" }).toString();
const t = await call("POST", "/v1/auth/", { "Content-Type": "application/x-www-form-urlencoded" }, form);
registra("AT_01", "Geração do token de sessão", `POST ${base.origin}/v1/auth/  (client_id, client_secret, grant_type=client_credentials)`, t);
if (t.status !== 200) { writeFileSync(saida, JSON.stringify(ev, null, 2)); process.exit(1); }
const token = JSON.parse(t.body).access_token;
const H = { ...J, Authorization: `Bearer ${token}` };
const ref = () => "RG" + Date.now().toString(36).toUpperCase().slice(-8);

// C_04 — webhook de CHECKOUT (antes do C_01, para o evento CREATED chegar)
const whBody = JSON.stringify({ url: webhookUrl, service: "CHECKOUT" });
const w = await call("POST", "/v1/webhooks/", H, whBody);
registra("C_04", "Cadastro de webhook (eventos de checkout)", `POST ${base.origin}/v1/webhooks/\n${whBody}`, w);
const wg = await call("GET", "/v1/webhooks/?service=CHECKOUT", H);
registra("C_04b", "Consulta do webhook de checkout", `GET ${base.origin}/v1/webhooks/?service=CHECKOUT`, wg);

// C_01 — criar checkout (cartão crédito/débito + Pix), o cliente escolhe na página do C6
const novo = (descricao) => JSON.stringify({
  amount: 5.00,
  description: descricao,
  external_reference_id: ref(),
  redirect_url: "https://regadoces.com.br/pedido/obrigado",
  payment: { card: { type: "CREDIT", installments: 1, fixed_installments: true, authenticate: "NOT_REQUIRED", capture: true }, pix: { key: "AUTO" } },
});
const b1 = novo("Regadoces - pedido de homologacao (link de pagamento)");
const c = await call("POST", "/v1/checkouts/", H, b1);
registra("C_01", "Criação de checkout (link de pagamento)", `POST ${base.origin}/v1/checkouts/\n${b1}`, c);
let id = null; try { id = JSON.parse(c.body).id; } catch {}

// C_02 — consultar
if (id) {
  const g = await call("GET", `/v1/checkouts/${id}`, H);
  registra("C_02", "Consulta de checkout", `GET ${base.origin}/v1/checkouts/${id}`, g);
}

// C_03 — cancelar (um 2º checkout, para o 1º continuar disponível para o teste de pagamento C_0502)
const b2 = novo("Regadoces - homologacao (checkout para cancelar)");
const c2 = await call("POST", "/v1/checkouts/", H, b2);
let id2 = null; try { id2 = JSON.parse(c2.body).id; } catch {}
if (id2) {
  const cancel = await call("PUT", `/v1/checkouts/${id2}/cancel`, H);
  registra("C_03", "Cancelamento de checkout", `PUT ${base.origin}/v1/checkouts/${id2}/cancel\n(checkout criado antes: ${id2})`, cancel);
  const g2 = await call("GET", `/v1/checkouts/${id2}`, H);
  registra("C_03b", "Consulta após cancelamento", `GET ${base.origin}/v1/checkouts/${id2}`, g2);
}

writeFileSync(saida, JSON.stringify(ev, null, 2));
console.log("evidências gravadas em", saida);
if (id) { try { console.log("\nLINK DE PAGAMENTO (checkout 1, para o teste C_0502):", JSON.parse(c.body).url); } catch {} }
