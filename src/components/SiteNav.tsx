"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "./CartContext";

/*
  Pílula de navegação translúcida centrada no topo (padrão das LPs).
  variant "escuro": links claros sobre foto/fundo escuro (home, blog,
  produtos, encomendas). variant "claro": para fundos claros.

  Logo abaixo da navegação fica o status da loja (o Ricardo abre/fecha
  pelo painel, como no iFood): "Loja online" com sinal verde ou
  "Loja offline" com sinal vermelho + horário de volta, se informado.
*/
const LINKS: { href: string; label: string; blank?: boolean }[] = [
  { href: "/", label: "Home" },
  { href: "/produtos", label: "Produtos" },
  { href: "/cardapio-regadoces.pdf", label: "Cardápio", blank: true },
  { href: "/encomendas", label: "Encomenda" },
  { href: "/sobre", label: "Sobre nós" },
  { href: "/depoimentos", label: "Avaliações" },
  { href: "/blog", label: "Na Mídia" },
  { href: "/#faq", label: "FAQ" },
];

export function useLojaStatus() {
  const [loja, setLoja] = useState<{ aberta: boolean; voltaAs: string } | null>(
    null
  );
  useEffect(() => {
    let ativo = true;
    fetch("/api/loja")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (ativo && d) setLoja(d);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);
  return loja;
}

export default function SiteNav({
  variant = "escuro",
}: {
  variant?: "escuro" | "claro";
}) {
  const { totalItens } = useCart();
  const loja = useLojaStatus();
  const claro = variant === "claro";
  return (
    <div className="absolute inset-x-0 top-4 z-30 flex flex-col items-center gap-2 px-4 sm:top-6">
      <nav
        className={`flex max-w-full flex-wrap items-center justify-center gap-x-5 gap-y-1 rounded-full border px-5 py-2.5 backdrop-blur-sm sm:gap-x-7 sm:px-9 sm:py-3 ${
          claro
            ? "border-marrom/30 bg-branco-quente/60 text-marrom"
            : "border-creme/60 bg-white/10 text-creme"
        }`}
      >
        {LINKS.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            target={l.blank ? "_blank" : undefined}
            rel={l.blank ? "noopener noreferrer" : undefined}
            className="whitespace-nowrap font-sans text-[13px] font-medium transition-opacity hover:opacity-70 sm:text-[15px]"
          >
            {l.label}
          </Link>
        ))}
        <Link
          href="/carrinho"
          aria-label="Carrinho"
          className="relative whitespace-nowrap font-sans text-[13px] font-semibold sm:text-[15px]"
        >
          🛒
          {totalItens > 0 && (
            <span className="absolute -right-3 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-creme text-[10px] font-bold text-vinho ring-1 ring-vinho/60">
              {totalItens}
            </span>
          )}
        </Link>
      </nav>

      {loja && (
        <span
          className={`flex items-center gap-2 rounded-full border px-4 py-1.5 font-sans text-[12px] font-semibold backdrop-blur-sm sm:text-[13px] ${
            loja.aberta
              ? claro
                ? "border-marrom/30 bg-branco-quente/60 text-marrom"
                : "border-creme/60 bg-white/10 text-creme"
              : "border-red-200 bg-red-700/90 text-white"
          }`}
        >
          <span
            aria-hidden
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              loja.aberta ? "bg-green-500" : "bg-red-300"
            }`}
          />
          {loja.aberta
            ? "Loja online"
            : loja.voltaAs
              ? `Loja offline — voltamos às ${loja.voltaAs}`
              : "Loja offline no momento"}
        </span>
      )}
    </div>
  );
}
