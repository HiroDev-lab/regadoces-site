import type { Metadata } from "next";
import Drip from "@/components/Drip";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import { Estrelas, LogoGoogle } from "@/components/AvaliacoesGoogle";
import { getGoogleInfo, readCollection, type Testimonial } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Avaliações — Regadoces" };

/*
  Página com TODAS as avaliações do Google (pedido do Ricardo, 31/08) +
  botão para o cliente avaliar no Google também. O link, a nota média e
  o total vêm do painel (Depoimentos → dados do Google).
*/
export default async function DepoimentosPage() {
  const [depoimentos, google] = await Promise.all([
    readCollection<Testimonial>("testimonials"),
    getGoogleInfo(),
  ]);
  const aprovados = depoimentos.filter((d) => d.aprovado);

  return (
    <div className="bg-vinho">
      <div className="relative px-5 pb-20 pt-44 sm:pt-36">
        <SiteNav />

        <h1 className="flex items-center justify-center gap-3 text-center font-display text-4xl leading-tight text-creme sm:text-5xl">
          <LogoGoogle className="h-9 w-9 sm:h-11 sm:w-11" />
          Avaliações do Google
        </h1>
        <p className="mt-3 text-center font-sans text-[17px] text-creme">
          <Estrelas nota={google.nota} className="text-[20px]" />{" "}
          <b>{google.nota.toFixed(1).replace(".", ",")}</b>
          {google.total > 0 && <> ({google.total} avaliações no Google)</>}
        </p>

        {google.link && (
          <div className="mt-8 text-center">
            <a
              href={google.link}
              target="_blank"
              rel="noopener noreferrer"
              className="relative inline-block min-w-[300px]"
            >
              <span className="ticket ticket-face relative block px-8 py-3 font-sans text-[14px] font-bold tracking-wide text-marrom transition-[filter] hover:brightness-95">
                ⭐ AVALIE NO GOOGLE VOCÊ TAMBÉM
              </span>
            </a>
          </div>
        )}

        <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {aprovados.map((d) => (
            <div key={d.id} className="bg-azul-btn px-6 py-7">
              <div className="flex items-start justify-between gap-3">
                <p className="font-sans text-2xl leading-tight text-marrom">
                  {d.nome}
                  <br />
                  {d.sobrenome}
                </p>
                <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center bg-white">
                  <LogoGoogle className="h-7 w-7" />
                </span>
              </div>
              <Estrelas nota={d.nota ?? 5} className="mt-3 block text-[18px]" />
              <p className="mt-3 font-sans text-[14px] leading-relaxed text-marrom">{d.texto}</p>
            </div>
          ))}
        </div>
        {aprovados.length === 0 && (
          <p className="mt-12 text-center font-sans text-[16px] text-creme/80">
            As avaliações aparecem aqui em breve.
          </p>
        )}
      </div>

      <Drip color="#720f23" className="bg-creme" h={9} />
      <SiteFooter />
    </div>
  );
}
