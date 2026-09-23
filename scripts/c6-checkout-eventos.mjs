// Lê as notificações de CHECKOUT que o C6 mandou para o webhook do site
// (coleção `c6_checkout_events`, gravada por src/app/api/webhooks/c6/route.ts)
// direto do Supabase de produção e imprime/exporta como evidência do roteiro.
// Uso (Git Bash, com as duas variáveis do .env do servidor no ambiente):
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/c6-checkout-eventos.mjs [idDoCheckout] [saida.json]
import { writeFileSync } from "node:fs";
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!url || !key) { console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (estão no .env da aplicação no cPanel)"); process.exit(1); }
const [, , filtroId, saida] = process.argv;
const r = await fetch(`${url}/rest/v1/collections?name=eq.c6_checkout_events&select=data,updated_at`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
if (!r.ok) { console.error("Supabase HTTP", r.status, await r.text()); process.exit(1); }
const rows = await r.json();
let eventos = rows[0]?.data ?? [];
if (filtroId) eventos = eventos.filter((e) => e.externalId === filtroId);
console.log(`${eventos.length} evento(s)${filtroId ? " do checkout " + filtroId : ""} (coleção atualizada em ${rows[0]?.updated_at ?? "-"})`);
for (const e of eventos) console.log(`  ${e.recebidoEm}  ${String(e.status).padEnd(9)} ${e.externalId}`);
if (saida) { writeFileSync(saida, JSON.stringify(eventos, null, 2)); console.log("gravado em", saida); }
