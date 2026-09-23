import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Drip from "@/components/Drip";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import TicketButton from "@/components/TicketButton";
import { getEncomenda } from "@/lib/db";

export const dynamic = "force-dynamic";

/*
  Páginas de detalhe das encomendas (RegaNaked Cake, Micro Brownies,
  Micro Palha Italiana, Brigadeiro de Colher) — a pessoa clica no card
  em /encomendas e vê fotos e opções antes de chamar no WhatsApp.
  Fotos (número livre, com legenda) e textos vêm do painel (Encomendas).
*/
export default async function ItemEncomendaPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item } = await params;
  const dados = await getEncomenda(item);
  if (!dados) notFound();

  const wa = `https://wa.me/5541985222525?text=${encodeURIComponent(dados.whatsappTexto)}`;

  return (
    <div className="bg-marrom">
      <div className="relative">
        <SiteNav />

        <section className="px-5 pb-16 pt-40 text-center sm:pt-44">
          <Link
            href="/encomendas"
            className="font-sans text-[14px] font-semibold text-creme/80 transition-opacity hover:opacity-70"
          >
            ← Voltar para Encomendas
          </Link>
          <h1 className="mt-4 font-display text-[clamp(38px,4vw,72px)] leading-tight text-creme">
            {dados.nome}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-sans text-[clamp(15px,1.05vw,20px)] leading-relaxed text-creme/90">
            {dados.resumo}
          </p>

          <div className="mx-auto mt-12 grid max-w-[1000px] grid-cols-1 items-start gap-8 md:grid-cols-2">
            {/* ---- fotos ---- */}
            <div className="flex flex-col gap-6">
              {dados.fotos.map((f, i) => (
                <figure key={`${f.url}-${i}`}>
                  {/* recorteCard: mostra só a zona da foto do card original */}
                  <div
                    className={`relative w-full overflow-hidden rounded-[22px] ${
                      f.recorteCard ? "aspect-[265/160]" : "aspect-[4/3]"
                    }`}
                  >
                    <Image
                      src={f.url}
                      alt={f.legenda || dados.nome}
                      fill
                      sizes="(max-width: 768px) 100vw, 500px"
                      className={`object-cover ${f.recorteCard ? "object-top" : ""}`}
                    />
                  </div>
                  {f.legenda && (
                    <figcaption className="mt-2 font-sans text-[14px] text-creme/80">
                      {f.legenda}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>

            {/* ---- informações ---- */}
            <div className="rounded-[22px] border border-creme/20 bg-gradient-to-b from-white/10 to-transparent px-8 py-9 text-left">
              <h2 className="font-sans text-[clamp(22px,1.7vw,30px)] text-creme">
                Como funciona
              </h2>
              <ul className="mt-5 flex flex-col gap-4">
                {dados.detalhes.map((d) => (
                  <li key={d} className="flex gap-3">
                    <span aria-hidden className="text-azul">✦</span>
                    <span className="font-sans text-[clamp(14px,1vw,18px)] leading-relaxed text-creme/90">
                      {d}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <TicketButton href={wa} className="w-full" textClassName="text-[clamp(14px,1vw,18px)]">
                  QUERO ENCOMENDAR
                </TicketButton>
                {dados.cardapio && (
                  <Link
                    href={dados.cardapio.href}
                    className="mt-4 inline-block font-sans text-[14px] font-semibold text-creme underline-offset-4 hover:underline"
                  >
                    {dados.cardapio.label} →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <Drip color="#421a14" className="bg-creme" h={9} />
      <SiteFooter />
    </div>
  );
}
