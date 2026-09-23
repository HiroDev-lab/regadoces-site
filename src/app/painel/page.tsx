import DashboardCards from "@/components/admin/DashboardCards";
import { resumoVisitas, type DiaVisitas } from "@/lib/visitas";
import {
  getLojaStatus,
  readCollection,
  type Coupon,
  type Order,
  type Post,
  type Product,
  type Testimonial,
} from "@/lib/db";

export const dynamic = "force-dynamic";

/* Visão geral do painel. */
export default async function AdminHome() {
  const [produtos, cupons, posts, pedidos, depoimentos, loja, visitas] = await Promise.all([
    readCollection<Product>("products"),
    readCollection<Coupon>("coupons"),
    readCollection<Post>("posts"),
    readCollection<Order>("orders"),
    readCollection<Testimonial>("testimonials"),
    getLojaStatus(),
    readCollection<DiaVisitas>("visits"),
  ]);

  const vHoje = resumoVisitas(visitas, 1);
  const v7 = resumoVisitas(visitas, 7);
  const v30 = resumoVisitas(visitas, 30);

  const semEstoque = produtos.filter((p) => p.estoque === 0).length;
  const pendentes = depoimentos.filter((d) => !d.aprovado).length;

  const cards = [
    {
      href: "loja",
      titulo: "Loja online",
      valor: loja.aberta ? "🟢 Aberta" : "🔴 Fechada",
      extra: loja.aberta
        ? "clientes podem comprar"
        : loja.voltaAs
          ? `volto às ${loja.voltaAs}`
          : "checkout bloqueado",
    },
    { href: "produtos", titulo: "Produtos", valor: produtos.length, extra: semEstoque ? `${semEstoque} sem estoque` : "estoque ok" },
    { href: "cupons", titulo: "Cupons", valor: cupons.filter((c) => c.ativo).length, extra: "ativos" },
    { href: "blog", titulo: "Matérias no blog", valor: posts.filter((p) => p.ativo).length, extra: "publicadas" },
    { href: "pedidos", titulo: "Pedidos", valor: pedidos.length, extra: `${pedidos.filter((p) => p.status === "recebido").length} novos` },
    { href: "depoimentos", titulo: "Depoimentos", valor: depoimentos.length, extra: pendentes ? `${pendentes} aguardando aprovação` : "tudo aprovado" },
  ];

  return (
    <div>
      <h1 className="font-sans text-3xl font-bold text-marrom">Visão geral</h1>
      <p className="mt-1 font-sans text-[14px] text-marrom/60">
        Bem-vindo ao painel da Regadoces.
      </p>
      <DashboardCards cards={cards} />

      {/* Visitas do site (pedido do Ricardo) — contador próprio, sem
          serviço de fora; começa a contar a partir de 31/08/2026 */}
      <h2 className="mt-10 font-sans text-xl font-bold text-marrom">Visitas do site</h2>
      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {(
          [
            ["Hoje", vHoje],
            ["Últimos 7 dias", v7],
            ["Últimos 30 dias", v30],
          ] as const
        ).map(([titulo, v]) => (
          <div key={titulo} className="rounded-2xl border border-marrom/10 bg-white p-6 shadow-sm">
            <p className="font-sans text-[14px] font-semibold text-marrom/60">{titulo}</p>
            <p className="mt-2 font-sans text-4xl font-bold text-vinho">{v.visitantes}</p>
            <p className="mt-1 font-sans text-[13px] text-marrom/60">
              visitantes · {v.pageviews} páginas vistas
            </p>
          </div>
        ))}
      </div>
      {v30.topCidades.length > 0 && (
        <div className="mt-4 rounded-2xl border border-marrom/10 bg-white p-6 shadow-sm">
          <p className="font-sans text-[14px] font-semibold text-marrom/60">
            De onde vieram (últimos 30 dias)
          </p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {v30.topCidades.map(([cidade, n]) => (
              <li key={cidade} className="flex justify-between font-sans text-[14px] text-marrom">
                <span>📍 {cidade}</span>
                <span className="font-semibold">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
