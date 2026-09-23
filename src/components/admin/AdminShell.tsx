"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/*
  Estrutura do painel (sidebar + conteúdo). Os links usam o primeiro
  segmento da URL do navegador como base — que é o ADMIN_SLUG secreto
  reescrito pelo middleware.

  Responsivo: no celular a sidebar vira uma gaveta aberta pelo botão ☰
  da barra superior (fecha ao navegar ou tocar no fundo escuro); no
  desktop (md+) fica fixa à esquerda, como sempre.
*/
const MENU = [
  { seg: "", label: "Visão geral", icone: "🏠" },
  { seg: "/loja", label: "Loja aberta/fechada", icone: "🏪" },
  { seg: "/produtos", label: "Produtos", icone: "🍰" },
  { seg: "/categorias", label: "Categorias", icone: "🗂️" },
  { seg: "/cupons", label: "Cupons", icone: "🎟️" },
  { seg: "/blog", label: "Blog", icone: "📰" },
  { seg: "/carrossel", label: "Carrossel da Home", icone: "🖼️" },
  { seg: "/depoimentos", label: "Avaliações", icone: "💬" },
  { seg: "/encomendas", label: "Encomendas", icone: "🎁" },
  { seg: "/sobre", label: "Sobre nós", icone: "📖" },
  { seg: "/faq", label: "FAQ (perguntas)", icone: "❓" },
  { seg: "/pedidos", label: "Pedidos", icone: "📦" },
  { seg: "/frete", label: "Frete", icone: "🛵" },
];

export default function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const base = "/" + (pathname.split("/")[1] ?? "");
  const resto = pathname.slice(base.length) || "";
  const [menuAberto, setMenuAberto] = useState(false);

  // fecha a gaveta ao trocar de página
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  // Sessão vencida: qualquer chamada /api/admin/* que voltar 401 mostra um
  // aviso claro e recarrega a página (que cai na tela de login), em vez de
  // deixar um "Não autorizado" solto no formulário.
  useEffect(() => {
    const original = window.fetch;
    let avisou = false;
    window.fetch = async (...args) => {
      const res = await original(...args);
      const alvo = args[0];
      const url =
        typeof alvo === "string" ? alvo : alvo instanceof URL ? alvo.pathname : alvo.url;
      if (res.status === 401 && url.includes("/api/admin/") && !avisou) {
        avisou = true;
        window.alert("Sua sessão no painel expirou. Entre de novo para continuar.");
        window.location.reload();
      }
      return res;
    };
    return () => {
      window.fetch = original;
    };
  }, []);

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-creme md:flex">
      {/* barra superior (só no celular) */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-vinho px-4 py-3 shadow-md md:hidden">
        <div className="leading-tight">
          <p className="font-display text-2xl text-creme">Regadoces</p>
          <p className="font-sans text-[9px] font-semibold uppercase tracking-widest text-creme/70">
            Painel do administrador
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu"
          className="rounded-lg border border-creme/50 px-3 py-1.5 text-xl leading-none text-creme"
        >
          ☰
        </button>
      </header>

      {/* fundo escuro atrás da gaveta (celular) */}
      {menuAberto && (
        <div
          aria-hidden
          onClick={() => setMenuAberto(false)}
          className="fixed inset-0 z-40 bg-marrom/60 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col bg-vinho transition-transform duration-200 md:static md:z-auto md:w-64 md:shrink-0 md:translate-x-0 md:border-r md:border-marrom/10 md:transition-none ${
          menuAberto ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between px-6 py-6">
          <div>
            <p className="font-display text-3xl text-creme">Regadoces</p>
            <p className="mt-1 font-sans text-[11px] font-semibold uppercase tracking-widest text-creme/70">
              Painel do administrador
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu"
            className="-mr-2 -mt-1 px-2 py-1 font-sans text-xl font-bold text-creme/80 md:hidden"
          >
            ✕
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          {MENU.map((m) => {
            const ativo = resto === m.seg || (m.seg === "" && resto === "");
            return (
              <Link
                key={m.seg}
                href={`${base}${m.seg}`}
                className={`rounded-lg px-4 py-2.5 font-sans text-[14px] font-medium transition-colors ${
                  ativo
                    ? "bg-creme text-vinho"
                    : "text-creme/90 hover:bg-white/10"
                }`}
              >
                <span className="mr-2">{m.icone}</span>
                {m.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-6 py-5">
          <p className="truncate font-sans text-[12px] text-creme/70">{email}</p>
          <button
            onClick={sair}
            className="mt-2 font-sans text-[13px] font-semibold text-creme underline-offset-2 hover:underline"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
