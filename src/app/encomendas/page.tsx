import Image from "next/image";
import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import Drip from "@/components/Drip";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import TicketButton from "@/components/TicketButton";
import { getEncomendas, getEncomendasTopo } from "@/lib/db";

export const dynamic = "force-dynamic";

const OCASIOES = [
  ["Aniversários", "Bolos e Tortas para tornar a comemoração ainda mais especial."],
  ["Festas e comemorações", "Opções para compor a mesa e atender diferentes convidados."],
  ["Eventos corporativos", "Doces para confraternizações, ações especiais e eventos."],
  ["Casamentos e celebrações", "Possibilidades para criar uma experiência doce para os convidados."],
];

/*
  Cards de "O que você pode encomendar?" — recriados em HTML (mesma
  calda e fontes dos PNGs do designer) para serem clicáveis. Foto e
  textos vêm do painel (Encomendas); cada card abre /encomendas/<id>.
*/

/* Calda marrom (mesma técnica do <Drip/>, com altura em px p/ o card) */
function caldaCard(height: number): CSSProperties {
  return {
    backgroundColor: "#421a14",
    WebkitMaskImage: 'url("/images/drips/calda.svg")',
    maskImage: 'url("/images/drips/calda.svg")',
    WebkitMaskRepeat: "repeat-x",
    maskRepeat: "repeat-x",
    WebkitMaskSize: "200% 100%",
    maskSize: "200% 100%",
    WebkitMaskPosition: "left top",
    maskPosition: "left top",
    height,
  };
}

function EncomendaCard({
  nome,
  desc,
  foto,
  href,
}: {
  nome: string;
  desc: string;
  foto: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group mx-auto block w-full max-w-[265px] transition-transform hover:-translate-y-1"
    >
      <div className="relative aspect-[265/165] overflow-hidden rounded-t-[22px]">
        <Image
          src={foto}
          alt={nome}
          fill
          sizes="265px"
          className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
        />
        {/* calda marrom "subindo" sobre a foto, como nos cards originais */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 rotate-180" style={caldaCard(30)} />
      </div>
      <div className="bg-marrom px-4 pb-1 pt-1 text-center">
        <h3 className="font-display text-[27px] leading-[1.1] text-creme">{nome}</h3>
        <p className="mx-auto mt-3 max-w-[225px] pb-2 font-sans text-[12.5px] leading-snug text-creme/90">
          {desc}
        </p>
      </div>
      {/* pingos escorrendo na base do card */}
      <div aria-hidden style={caldaCard(26)} />
    </Link>
  );
}

/** Enter no título do painel vira quebra de linha só no desktop (como na LP). */
function Linhas({ texto }: { texto: string }) {
  const linhas = texto.split("\n");
  return (
    <>
      {linhas.map((l, i) => (
        <Fragment key={i}>
          {l}
          {i < linhas.length - 1 && (
            <>
              {" "}
              <br className="hidden sm:block" />
            </>
          )}
        </Fragment>
      ))}
    </>
  );
}

export default async function EncomendasPage() {
  const [itens, topo] = await Promise.all([getEncomendas(), getEncomendasTopo()]);
  return (
    <div className="bg-marrom">
      {/* ============ HERO ============ */}
      <div className="relative">
        <SiteNav />
        {/* hero na proporcao da LP (890px em 1920) */}
        <div className="relative h-[640px] w-full overflow-hidden sm:h-[46vw] sm:min-h-[640px]">
          <Image
            src={topo.foto}
            alt="Mesa de doces em evento"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* como na LP: degradê marrom só no topo (para o texto), foto
              bem visível no meio e fundindo com o marrom na base */}
          <div className="absolute inset-0 bg-gradient-to-b from-marrom via-marrom/45 via-45% to-transparent to-70%" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-marrom" />

          <div className="absolute inset-x-0 top-44 px-5 text-center sm:top-28">
            <h1 className="mx-auto max-w-4xl font-display text-4xl leading-tight text-creme sm:text-[52px]">
              <Linhas texto={topo.titulo} />
            </h1>
            <p className="mx-auto mt-4 whitespace-pre-line font-sans text-[clamp(15px,1vw,19px)] leading-relaxed text-creme sm:max-w-[52vw]">
              {topo.texto}
            </p>
            <div className="mt-14 sm:mt-16">
              <a
                href="https://wa.me/5541985222525?text=Ol%C3%A1!%20Quero%20falar%20sobre%20uma%20encomenda%20Regadoces."
                target="_blank"
                rel="noopener noreferrer"
                className="relative inline-block min-w-[min(100%,clamp(300px,26vw,500px))]"
              >
                <span className="ticket relative block bg-[#5a1d15]/90 px-10 py-3 text-center font-sans text-[clamp(15px,0.95vw,18px)] text-creme transition-[filter] hover:brightness-110">
                  Falar sobre minha encomenda
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ============ OCASIÕES ============ */}
      <section className="bg-marrom px-5 pb-10 pt-[max(24px,3.5vw)] text-center">
        <span className="inline-block bg-creme px-5 py-2 font-sans text-[clamp(11px,0.78vw,15px)] font-semibold tracking-widest text-marrom">
          PARA QUAL OCASIÃO?
        </span>
        <h2 className="mt-[max(16px,1.3vw)] font-display text-[clamp(34px,3.4vw,66px)] leading-tight text-creme">
          Para celebrar do seu jeito.
        </h2>
        <div className="mx-auto mt-[max(28px,2.5vw)] max-w-[min(100%,54vw)] min-w-[min(100%,720px)] rounded-[2vw] border border-creme/20 bg-gradient-to-b from-white/10 to-transparent px-8 py-[max(36px,3vw)] sm:px-16">
          {OCASIOES.map(([t, d]) => (
            <div key={t} className="mb-[max(28px,2.6vw)] last:mb-0">
              <h3 className="font-sans text-[clamp(24px,1.9vw,36px)] text-creme">{t}</h3>
              <p className="mt-[max(8px,0.6vw)] font-sans text-[clamp(14px,0.95vw,18px)] text-creme/90">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ O QUE VOCÊ PODE ENCOMENDAR ============ */}
      <Drip color="#421a14" className="bg-vinho" h={10} />
      <section className="bg-vinho px-5 pb-20 pt-6 text-center">
        <h2 className="font-display text-[clamp(34px,3.4vw,66px)] leading-tight text-creme">
          O que você pode encomendar?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl font-sans text-[clamp(14px,0.95vw,18px)] text-creme/90">
          Clique em uma opção para ver fotos, tamanhos e mais informações.
        </p>
        <div className="mx-auto mt-12 grid max-w-[1140px] grid-cols-1 items-start gap-[27px] sm:grid-cols-2 lg:grid-cols-4">
          {itens.map((p) => (
            <EncomendaCard
              key={p.id}
              nome={p.nome}
              desc={p.desc}
              foto={p.cardFoto}
              href={`/encomendas/${p.id}`}
            />
          ))}
        </div>
        <div className="mt-12">
          <TicketButton
            href="https://wa.me/5541985222525?text=Ol%C3%A1!%20Quero%20fazer%20uma%20encomenda%20para%20o%20meu%20evento."
            className="min-w-[min(100%,clamp(320px,37vw,712px))]"
            textClassName="text-[clamp(15px,1.05vw,20px)]"
          >
            QUERO FAZER MINHA ENCOMENDA
          </TicketButton>
        </div>
      </section>

      <Drip color="#720f23" className="bg-creme" h={9} />
      <SiteFooter />
    </div>
  );
}
