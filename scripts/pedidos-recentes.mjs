// Lista pedidos recentes direto do Supabase (produção) — SÓ LEITURA. CPF sai mascarado.
// Uso:
//   node --env-file=C:/Users/Victo/.regadoces-supabase.env scripts/pedidos-recentes.mjs [AAAA-MM-DD]
// Sem data = últimos 2 dias. Mostra também os cupons e o estoque dos produtos dos pedidos listados.

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (use --env-file).");
  process.exit(1);
}

async function readCollection(name) {
  const r = await fetch(`${URL_}/rest/v1/collections?select=data&name=eq.${name}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) throw new Error(`Supabase ${name}: HTTP ${r.status}`);
  const j = await r.json();
  return j[0]?.data ?? [];
}

const mascara = (cpf) => (cpf ?? "").replace(/\d(?=\d{2})/g, "*");

const desde = process.argv[2] ?? new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
const orders = await readCollection("orders");
const recentes = orders.filter((o) => o.criadoEm >= desde);
console.log(`total de pedidos: ${orders.length} | desde ${desde}: ${recentes.length}`);

for (const o of recentes) {
  const p = o.pagamento ?? {};
  console.log(`\n# ${o.id}  ${o.criadoEm}`);
  console.log(`  status: ${o.status} | pagamento: ${p.metodo} ${p.tipoCartao ?? ""} → ${p.status} | total R$ ${o.total} | cupom ${o.cupom ?? "-"} | tentativa ${o.tentativaId ?? "-"}`);
  console.log(`  cliente: ${o.cliente?.nome} ${o.cliente?.sobrenome} | cpf ${mascara(o.cliente?.cpf)} | ${o.entrega?.tipo} ${o.entrega?.bairro ?? ""} ${o.entrega?.cep ?? ""}`);
  console.log(`  itens: ${o.itens.map((i) => `${i.nome} x${i.quantidade}`).join("; ")}`);
  console.log(`  link/txid: ${p.linkPagamento ?? p.txid ?? p.referencia ?? ""} | expira ${p.expiraEm ?? "-"}`);
  console.log(`  página do pedido: https://regadoces.com.br/pedido/${o.id}`);
}

const cupons = await readCollection("coupons");
console.log("\ncupons:");
for (const c of cupons) {
  console.log(`  ${c.codigo}: ativo=${c.ativo} umPorCpf=${c.umPorCpf} usos=${c.usos} tipo=${c.tipo} valor=${c.valor} validade=${c.validade ?? c.expiraEm ?? "-"}`);
}

const ids = new Set(recentes.flatMap((o) => o.itens.map((i) => i.produtoId)));
if (ids.size) {
  const prods = await readCollection("products");
  console.log("\nestoque dos produtos desses pedidos:");
  for (const p of prods) {
    if (ids.has(p.id)) console.log(`  ${p.id} ${p.nome}: estoque=${p.estoque} ativo=${p.ativo} preco=${p.preco} promo=${p.precoPromocional ?? "-"}`);
  }
}
