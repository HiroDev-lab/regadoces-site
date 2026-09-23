import Image from "next/image";
import Link from "next/link";
import Drip from "./Drip";
import SiteFooter from "./SiteFooter";

/*
  Estrutura das páginas de checkout (LPs 01/02/03): fundo creme,
  wordmark "Regadoces" centralizado no topo, breadcrumb de passos,
  calda creme escorrendo sobre faixa branca antes do rodapé.
*/
export function CheckoutSteps({ atual }: { atual: 1 | 2 | 3 }) {
  const passos = [
    { n: 1, href: "/carrinho", label: "1.Carrinho" },
    { n: 2, href: "/checkout/identificacao", label: "2.Identificação de entrega" },
    { n: 3, href: "/checkout/pagamento", label: "3.Pagamento" },
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 font-sans text-[clamp(14px,1.1vw,21px)] text-marrom sm:gap-3">
      {passos.map((p) => (
        <span key={p.n} className="flex items-center gap-2 sm:gap-3">
          {p.n <= atual ? (
            <Link
              href={p.href}
              className={p.n === atual ? "font-bold underline underline-offset-4" : ""}
            >
              {p.n === atual ? p.label : p.label.replace(" de entrega", "")}
            </Link>
          ) : (
            <span>{p.label.replace(" de entrega", "")}</span>
          )}
          <span aria-hidden>&gt;</span>
        </span>
      ))}
    </div>
  );
}

export default function CheckoutShell({
  passo,
  children,
}: {
  passo: 1 | 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-creme">
      <header className="pt-[max(32px,2.6vw)] text-center">
        <Link href="/" className="inline-block">
          <Image
            src="/images/brand/wordmark.png"
            alt="Regadoces"
            width={460}
            height={112}
            priority
            className="h-auto w-[clamp(260px,23.5vw,452px)]"
          />
        </Link>
      </header>

      {/* respiros da LP: wordmark → passos ~200px, passos → conteudo ~100px (em 1920) */}
      <div className="mt-[max(56px,10vw)]">
        <CheckoutSteps atual={passo} />
      </div>

      <main className="mx-auto w-full max-w-[1660px] flex-1 px-5 pb-[max(64px,6vw)] pt-[max(32px,4vw)] lg:w-[86vw] lg:px-0">
        {children}
      </main>

      {/* calda creme escorrendo sobre o branco, como nas LPs */}
      <div className="bg-white">
        <Drip color="#f7e6d5" h={9.5} />
      </div>
      <SiteFooter />
    </div>
  );
}
