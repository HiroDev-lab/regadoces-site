// Cadastra (ou consulta) o webhook de CHECKOUT (cartão crédito/débito via link de pagamento)
// no C6 Bank, no ambiente apontado por C6_BASE_URL (sandbox por padrão).
// Uso (Git Bash, na pasta do projeto, com as variáveis C6_* no ambiente):
//   node scripts/c6-webhook-checkout.mjs https://regadoces.com.br/api/webhooks/c6   → cadastra e confere
//   node scripts/c6-webhook-checkout.mjs                                            → só consulta
//   node scripts/c6-webhook-checkout.mjs --escopos                                  → mostra as permissões da chave
// Sai com erro (1) se o token falhar ou se a chave não tiver permissão de checkout/webhook.
import https from "node:https";
import { readFileSync } from "node:fs";

// Em produção o Checkout tem chave de API própria (C6_CHECKOUT_*, 18/09/2026); se ela estiver no
// ambiente, usa; senão usa a mesma do Pix (C6_*).
const envRaw = (n) => (process.env[n] ?? "").trim();
const env = (n) => (envRaw("C6_CHECKOUT_CLIENT_ID") ? envRaw(n.replace(/^C6_/, "C6_CHECKOUT_")) || envRaw(n) : envRaw(n));
for (const n of ["C6_CLIENT_ID", "C6_CLIENT_SECRET", "C6_CERT_PATH", "C6_CERT_KEY_PATH"]) {
  if (!env(n)) { console.error(`Falta a variável ${n}`); process.exit(1); }
}
if (envRaw("C6_CHECKOUT_CLIENT_ID")) console.log(`(usando a chave de API do CHECKOUT: ${envRaw("C6_CHECKOUT_CLIENT_ID").slice(0, 8)}…)`);
const base = new URL(env("C6_BASE_URL") || "https://baas-api-sandbox.c6bank.info");
const cert = readFileSync(env("C6_CERT_PATH")), key = readFileSync(env("C6_CERT_KEY_PATH"));

function call(method, path, headers = {}, body) {
  return new Promise((ok, err) => {
    const r = https.request({ host: base.hostname, path, method, cert, key, timeout: 25000,
      headers: { ...headers, ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}) } },
      (res) => { let d = ""; res.on("data", (c) => (d += c)).on("end", () => ok({ status: res.statusCode, body: d })); });
    r.on("error", err); r.on("timeout", () => { r.destroy(); err(new Error("timeout")); });
    if (body) r.write(body); r.end();
  });
}

const form = new URLSearchParams({ client_id: env("C6_CLIENT_ID"), client_secret: env("C6_CLIENT_SECRET"), grant_type: "client_credentials" }).toString();
const t = await call("POST", "/v1/auth/", { "Content-Type": "application/x-www-form-urlencoded" }, form);
if (t.status !== 200) { console.error("auth falhou:", t.status, t.body.slice(0, 200)); process.exit(1); }
const tok = JSON.parse(t.body);
const escopos = String(tok.scope ?? "").split(" ").filter(Boolean).sort();
const arg = process.argv[2];

if (arg === "--escopos") {
  const interessam = escopos.filter((s) => /checkout|webhook|pix|cob/.test(s));
  console.log("  " + (interessam.join(" ") || "(nenhum)"));
  const temCheckout = escopos.includes("checkout.write") && escopos.includes("checkout.read");
  console.log(temCheckout ? "  → checkout.read/write OK (cartão pode ser ligado)" : "  → SEM checkout.read/write: liberar a permissão CHECKOUT na chave de API (Web Banking)");
  process.exit(temCheckout ? 0 : 1);
}

const H = { "Content-Type": "application/json", Authorization: `Bearer ${tok.access_token}`,
  "partner-software-name": "Loja online Regadoces", "partner-software-version": "1.0.0" };
if (arg) {
  const r = await call("POST", "/v1/webhooks/", H, JSON.stringify({ url: arg, service: "CHECKOUT" }));
  console.log("cadastro:", r.status, r.body.slice(0, 300));
  if (r.status < 200 || r.status >= 300) process.exit(1);
}
const g = await call("GET", "/v1/webhooks/?service=CHECKOUT", H);
console.log("webhook CHECKOUT atual:", g.status, g.body.slice(0, 300));
if (g.status < 200 || g.status >= 300) process.exit(1);
