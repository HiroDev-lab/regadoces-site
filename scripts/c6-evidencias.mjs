// Executa, no sandbox do C6, os testes do "Roteiro de Testes" que o site usa
// e grava as evidências (status + response body) em um JSON, para preencher
// o roteiro de homologação.
//   AT_01    POST /v1/auth/                (token)
//   P_01_02  POST /v2/pix/cob              (cobrança imediata sem txid)
//   P_01_04  GET  /v2/pix/cob/{txid}       (consultar cobrança)
//   P_06_01  PUT  /v2/pix/webhook/{chave}  (cadastrar webhook)
//   P_06_02  GET  /v2/pix/webhook/{chave}  (consultar webhook)
// Uso: (com C6_* no ambiente)  node scripts/c6-evidencias.mjs [saida.json] [urlWebhook]
// Obs.: o sandbox do C6 funciona de segunda a sexta, 7h–22h.
import https from "node:https";
import { readFileSync, writeFileSync } from "node:fs";

const env = (n) => (process.env[n] ?? "").trim();
const base = new URL(env("C6_BASE_URL") || "https://baas-api-sandbox.c6bank.info");
const cert = readFileSync(env("C6_CERT_PATH")), key = readFileSync(env("C6_CERT_KEY_PATH"));
const saida = process.argv[2] || "c6-evidencias.json";
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
const pretty = (b) => { try { return JSON.stringify(JSON.parse(b), null, 2); } catch { return b.slice(0, 2000); } };
const ev = {};
const registra = (id, titulo, req, r) => { ev[id] = { titulo, request: req, status: r.status, body: pretty(r.body), ok: r.status >= 200 && r.status < 300, quando: new Date().toISOString() }; console.log(`${ev[id].ok ? "✓" : "x"} ${id} ${titulo} → HTTP ${r.status}`); };

const form = new URLSearchParams({ client_id: env("C6_CLIENT_ID"), client_secret: env("C6_CLIENT_SECRET"), grant_type: "client_credentials" }).toString();
const t = await call("POST", "/v1/auth/", { "Content-Type": "application/x-www-form-urlencoded" }, form);
registra("AT_01", "Geração do token de sessão", `POST ${base.origin}/v1/auth/  (client_id, client_secret, grant_type=client_credentials)`, t);
if (t.status !== 200) { writeFileSync(saida, JSON.stringify(ev, null, 2)); process.exit(1); }
const token = JSON.parse(t.body).access_token;
const H = { Authorization: `Bearer ${token}` };

const cobBody = JSON.stringify({ calendario: { expiracao: 3600 }, valor: { original: "1.00" }, chave: env("C6_PIX_KEY"), solicitacaoPagador: "Regadoces - pedido de homologacao" });
const c = await call("POST", "/v2/pix/cob", { "Content-Type": "application/json", ...H }, cobBody);
registra("P_01_02", "Criar cobrança imediata sem txid", `POST ${base.origin}/v2/pix/cob\n${cobBody}`, c);
let txid = null; try { txid = JSON.parse(c.body).txid; } catch {}
if (txid) {
  const g = await call("GET", `/v2/pix/cob/${txid}`, H);
  registra("P_01_04", "Consultar cobrança imediata", `GET ${base.origin}/v2/pix/cob/${txid}`, g);
}
const chave = encodeURIComponent(env("C6_PIX_KEY"));
const w = await call("PUT", `/v2/pix/webhook/${chave}`, { "Content-Type": "application/json", ...H }, JSON.stringify({ webhookUrl }));
registra("P_06_01", "Configurar o webhook Pix", `PUT ${base.origin}/v2/pix/webhook/{chave}\n{"webhookUrl":"${webhookUrl}"}`, w);
const wg = await call("GET", `/v2/pix/webhook/${chave}`, H);
registra("P_06_02", "Consultar o webhook Pix", `GET ${base.origin}/v2/pix/webhook/{chave}`, wg);

writeFileSync(saida, JSON.stringify(ev, null, 2));
console.log("evidências gravadas em", saida);
