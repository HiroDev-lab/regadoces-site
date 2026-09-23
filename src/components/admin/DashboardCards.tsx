"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/*
  Cards da visão geral do painel. O link usa o 1º segmento da URL do
  navegador como base (mesma técnica do AdminShell) — não depende da
  env ADMIN_SLUG no servidor, que já serviu HTML velho de cache.
*/
export type DashboardCard = {
  href: string;
  titulo: string;
  valor: string | number;
  extra: string;
};

export default function DashboardCards({ cards }: { cards: DashboardCard[] }) {
  const pathname = usePathname();
  const base = "/" + (pathname.split("/")[1] ?? "");
  return (
    <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Link
          key={c.titulo}
          href={`${base}/${c.href}`}
          className="rounded-2xl border border-marrom/10 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="font-sans text-[14px] font-semibold text-marrom/60">
            {c.titulo}
          </p>
          <p className="mt-2 font-sans text-4xl font-bold text-vinho">{c.valor}</p>
          <p className="mt-1 font-sans text-[13px] text-marrom/60">{c.extra}</p>
        </Link>
      ))}
    </div>
  );
}
