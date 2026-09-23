// Cancela checkouts (links de pagamento de cartão) ainda não pagos no C6 — PUT /v1/checkouts/{id}/cancel (204 = ok).
// Usa a chave de API do CHECKOUT (C6_CHECKOUT_*) se estiver no ambiente; senão a do Pix (C6_*).
// Uso (Git Bash, na pasta do projeto, com os .env carregados):
//   set -a; . ~/.regadoces-c6-prod.env; . ~/.regadoces-c6-checkout.env; set +a
//   node scripts/c6-checkout-cancelar.mjs <checkoutId> [<checkoutId> ...]
// Serve para limpar pedidos de teste. Um checkout já PAGO não pode ser cancelado por aqui (estorno = Web Banking).
import https from "node:https";
import { readFileSync } from "node:fs";

const envRaw = (n) => (process.env[n] ?? "").trim();
const env = (n) => (envRaw("C6_CHECKOUT_CLIENT_ID") ? envRaw(n.replace(/^C6_/, "C6_CHECKOUT_")) || envRaw(n) : envRaw(n));
const ids = process.argv.slice(2);
if (!ids.length) { console.error("uso: node scripts/c6-checkout-cancelar.mjs <checkoutId> [...]"); process.exit(1); }
for (const n of ["C6_CLIENT_ID", "C6_CLIENT_SECRET", "C6_CERT_PATH", "C6_CERT_KEY_PATH"]) {
  if (!env(n)) { console.error(`Falta a variável ${n}`); process.exit(1); }
}
const base = new URL(envRaw("C6_BASE_URL") || "https://baas-api-sandbox.c6bank.info");
const cert = readFileSync(env("C6_CERT_PATH")), key = readFileSync(env("C6_CERT_KEY_PATH"));

function call(method, path, headers = {}, body) {
  return new Promise((ok, err) => {
    const r = https.request({ host: base.hostname, path, method, cert, key, timeout: 25000,
      headers: { ...headers, ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}) } },
      (res) => { let d = ""; res.on("data", (c) => (d += c)).on("end", () => ok({ status: res.statusCode, body: d })); });
    r.on("error", err); r.on("timeout", () => { r.destroy(); err(new Error("timeout")); }); if (body) r.write(body); r.end();
  });
}
const form = new URLSearchParams({ client_id: env("C6_CLIENT_ID"), client_secret: env("C6_CLIENT_SECRET"), grant_type: "client_credentials" }).toString();
const t = await call("POST", "/v1/auth/", { "Content-Type": "application/x-www-form-urlencoded" }, form);
if (t.status !== 200) { console.error("auth falhou:", t.status, t.body.slice(0, 200)); process.exit(1); }
const H = { Authorization: `Bearer ${JSON.parse(t.body).access_token}`, "partner-software-name": "Loja online Regadoces", "partner-software-version": "1.0.0" };
console.log(`ambiente: ${base.hostname} | chave: ${env("C6_CLIENT_ID").slice(0, 8)}…`);
let falhas = 0;
for (const id of ids) {
  const antes = await call("GET", `/v1/checkouts/${encodeURIComponent(id)}`, H);
  const st = antes.status === 200 ? JSON.parse(antes.body).status : `HTTP ${antes.status}`;
  const c = await call("PUT", `/v1/checkouts/${encodeURIComponent(id)}/cancel`, H);
  const depois = await call("GET", `/v1/checkouts/${encodeURIComponent(id)}`, H);
  const st2 = depois.status === 200 ? JSON.parse(depois.body).status : `HTTP ${depois.status}`;
  const ok = c.status === 204 || c.status === 200;
  if (!ok) falhas++;
  console.log(`${id}: ${st} → cancel HTTP ${c.status}${ok ? "" : " " + c.body.slice(0, 150)} → ${st2}`);
}
process.exit(falhas ? 1 : 0);
