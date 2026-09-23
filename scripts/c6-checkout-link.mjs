// Cria UM checkout (link de pagamento: cartão crédito/débito + Pix) no ambiente
// apontado por C6_BASE_URL (sandbox por padrão) e imprime id + URL.
// Serve para os testes C_0501/C_0502 do roteiro: criar o link DEPOIS do webhook
// de CHECKOUT estar cadastrado e do site estar guardando os eventos.
// Uso: (com C6_* no ambiente)  node scripts/c6-checkout-link.mjs [valor] [descricao]
import https from "node:https";
import { readFileSync } from "node:fs";
const env = (n) => (process.env[n] ?? "").trim();
const base = new URL(env("C6_BASE_URL") || "https://baas-api-sandbox.c6bank.info");
const cert = readFileSync(env("C6_CERT_PATH")), key = readFileSync(env("C6_CERT_KEY_PATH"));
const valor = Number(process.argv[2] || "5"), descricao = process.argv[3] || "Regadoces - homologacao (evento de webhook)";
function call(method, path, headers = {}, body) {
  return new Promise((ok, err) => {
    const r = https.request({ host: base.hostname, path, method, cert, key, timeout: 25000, headers: { ...headers, ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}) } },
      (res) => { let d = ""; res.on("data", (c) => (d += c)).on("end", () => ok({ status: res.statusCode, body: d })); });
    r.on("error", err); r.on("timeout", () => { r.destroy(); err(new Error("timeout")); }); if (body) r.write(body); r.end();
  });
}
const form = new URLSearchParams({ client_id: env("C6_CLIENT_ID"), client_secret: env("C6_CLIENT_SECRET"), grant_type: "client_credentials" }).toString();
const t = await call("POST", "/v1/auth/", { "Content-Type": "application/x-www-form-urlencoded" }, form);
if (t.status !== 200) { console.error("auth falhou:", t.status, t.body.slice(0, 200)); process.exit(1); }
const H = { "Content-Type": "application/json", Authorization: `Bearer ${JSON.parse(t.body).access_token}`, "partner-software-name": "Loja online Regadoces", "partner-software-version": "1.0.0" };
const body = JSON.stringify({ amount: valor, description: descricao, external_reference_id: "RG" + Date.now().toString(36).toUpperCase().slice(-8), redirect_url: "https://regadoces.com.br/pedido/obrigado",
  payment: { card: { type: "CREDIT", installments: 1, fixed_installments: true, authenticate: "NOT_REQUIRED", capture: true }, pix: { key: "AUTO" } } });
const c = await call("POST", "/v1/checkouts/", H, body);
console.log("HTTP", c.status, "\n" + c.body, "\n\nrequest:\n" + body);
