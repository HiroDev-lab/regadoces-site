// Cadastra (ou consulta) o webhook do Pix no C6 Bank.
// Uso (Git Bash, na pasta do projeto, com as variáveis C6_* no ambiente):
//   node scripts/c6-webhook.mjs https://regadoces.com.br/api/webhooks/c6   → cadastra
//   node scripts/c6-webhook.mjs                                           → só consulta
import https from "node:https";
import { readFileSync } from "node:fs";

const env = (n) => (process.env[n] ?? "").trim();
for (const n of ["C6_CLIENT_ID", "C6_CLIENT_SECRET", "C6_PIX_KEY", "C6_CERT_PATH", "C6_CERT_KEY_PATH"]) {
  if (!env(n)) { console.error(`Falta a variável ${n}`); process.exit(1); }
}
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
const token = JSON.parse(t.body).access_token;
const chave = encodeURIComponent(env("C6_PIX_KEY"));
const url = process.argv[2];
if (url) {
  const r = await call("PUT", `/v2/pix/webhook/${chave}`, { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, JSON.stringify({ webhookUrl: url }));
  console.log("cadastro:", r.status, r.body.slice(0, 300));
}
const g = await call("GET", `/v2/pix/webhook/${chave}`, { Authorization: `Bearer ${token}` });
console.log("webhook atual:", g.status, g.body.slice(0, 300));
