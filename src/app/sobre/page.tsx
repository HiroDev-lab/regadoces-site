import Image from "next/image";
import { Fragment } from "react";
import Drip from "@/components/Drip";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import TicketButton from "@/components/TicketButton";
import { getSobre } from "@/lib/db";

export const dynamic = "force-dynamic";

/*
  Página "Sobre nós" — reproduz a LP do designer (1920px de largura) com
  medidas proporcionais à tela (vw), para que a página fique igual à LP em
  qualquer tamanho de monitor:
    - hero 16:9 com a arte oficial (Ricardo + círculo) e o texto na posição
      da LP (coluna esquerda, ~20% da largura)
    - wordmark gigante derretendo na faixa vinho
    - "O que fazemos" com as 4 tiras de foto, "Eventos e festas",
      foto da cozinha sobre a calda vinho→marrom e "Feito por pessoas"
  Tamanhos de fonte: clamp(mínimo p/ celular, proporção da LP, máximo).
*/

const TXT = "text-[clamp(15px,1.1vw,21px)] leading-[1.45]";
const TITULO = "font-display leading-[1.05] text-[clamp(34px,3.5vw,68px)]";
const LABEL =
  "inline-block bg-marrom px-[1vw] py-[0.45vw] font-sans text-[clamp(11px,0.78vw,15px)] font-semibold tracking-widest text-creme";

/** Quebra "linha1\nlinha2" em <br/> fixo (títulos) ou só no desktop (textos). */
function Linhas({ texto, soDesktop = false }: { texto: string; soDesktop?: boolean }) {
  const linhas = texto.split("\n");
  return (
    <>
      {linhas.map((l, i) => (
        <Fragment key={i}>
          {l}
          {i < linhas.length - 1 &&
            (soDesktop ? (
              <>
                {" "}
                <br className="hidden sm:block" />
              </>
            ) : (
              <br />
            ))}
        </Fragment>
      ))}
    </>
  );
}

export default async function SobrePage() {
  const sobre = await getSobre();
  return (
    <div className="bg-vinho">
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden bg-[#c9c1bd]">
        <SiteNav variant="claro" />
        <div className="relative mx-auto max-w-[1920px] sm:aspect-[16/9]">
          <Image
            src="/images/sobre/hero-ricardo.jpg"
            alt="Ricardo, fundador da Regadoces"
            fill
            priority
            sizes="100vw"
            className="object-cover object-right"
          />
          {/* no celular a foto fica atrás do texto: clareia para ler */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/70 to-white/30 sm:hidden" />

          <div className="relative px-6 pb-36 pt-44 sm:absolute sm:left-[20%] sm:top-[11%] sm:w-[31.5%] sm:p-0">
            <h1 className="font-display text-[clamp(40px,3.6vw,70px)] leading-none text-vinho">
              Sobre nós
            </h1>
            <div
              className={`mt-[clamp(18px,1.6vw,32px)] flex flex-col gap-[clamp(14px,1.3vw,26px)] font-sans text-marrom ${TXT}`}
            >
              {sobre.heroParagrafos.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </div>

        {/* wordmark gigante por cima da base da foto, derretendo na faixa vinho */}
        <div className="pointer-events-none relative z-10 -mb-[0.3em] -mt-[11vw] overflow-hidden text-[18vw] leading-none">
          <p className="whitespace-nowrap text-center font-display text-vinho">
            Regadoces
          </p>
        </div>
        <div className="relative z-20 bg-vinho py-[0.9vw] text-center">
          <p className="font-sans text-[clamp(20px,2.1vw,40px)] tracking-wide text-branco-quente">
            REGADO + DOCES = REGADOCES!
          </p>
        </div>
      </div>

      {/* ============ O QUE FAZEMOS ============ */}
      <section className="bg-vinho px-5 py-[clamp(48px,4.5vw,90px)]">
        <div className="mx-auto grid max-w-[62vw] min-w-[min(100%,1100px)] grid-cols-1 items-center gap-[clamp(32px,2.2vw,44px)] lg:grid-cols-[1fr_1.15fr]">
          <div>
            <span className={LABEL}>O QUE FAZEMOS</span>
            <h2 className={`mt-[clamp(14px,1.2vw,24px)] text-creme sm:whitespace-nowrap ${TITULO}`}>
              <Linhas texto={sobre.fazemosTitulo} />
            </h2>
            <p className={`mt-[clamp(16px,1.6vw,32px)] font-sans text-creme ${TXT}`}>
              {sobre.fazemosTexto}
            </p>
            <div className="mt-[clamp(20px,1.8vw,36px)]">
              <TicketButton
                href="/cardapio-regadoces.pdf"
                target="_blank"
                className="min-w-[min(100%,clamp(280px,24vw,470px))]"
              >
                {sobre.fazemosBotao}
              </TicketButton>
            </div>
          </div>
          {/* tiras de foto que "abrem" no hover (a tira cresce e revela
              mais da foto; as vizinhas encolhem) */}
          <div className="flex aspect-[800/520] w-full gap-[0.3vw] overflow-hidden rounded-[0.6vw]">
            {sobre.tiras.map((m, i) => (
              <div
                key={`${m}-${i}`}
                className="relative h-full flex-1 overflow-hidden transition-[flex-grow] duration-500 ease-out hover:flex-[2.6]"
              >
                <Image
                  src={m}
                  alt="Doce Regadoces"
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ EVENTOS E FESTAS ============ */}
      <section className="bg-vinho px-5 pb-[clamp(48px,5vw,100px)] pt-[clamp(16px,2vw,40px)] text-center">
        <span className={LABEL}>EVENTOS E FESTAS</span>
        <h2 className={`mt-[clamp(14px,1.2vw,24px)] text-creme ${TITULO}`}>
          <Linhas texto={sobre.eventosTitulo} />
        </h2>
        <p className={`mx-auto mt-[clamp(18px,1.8vw,36px)] font-sans text-creme sm:max-w-[34vw] ${TXT}`}>
          <Linhas texto={sobre.eventosTexto1} soDesktop />
        </p>
        <p className={`mx-auto mt-[clamp(16px,1.4vw,28px)] font-sans text-creme sm:max-w-[50vw] ${TXT}`}>
          {sobre.eventosTexto2}
        </p>
      </section>

      {/* ============ FEITO POR PESSOAS ============ */}
      <Drip color="#720f23" className="bg-marrom" h={10} />
      <section className="bg-marrom px-5 pb-[clamp(60px,6vw,120px)] text-center">
        {/* moldura da LP (60% da largura, 1160x690) por cima da calda; só a
            foto foi trocada, a pedido do designer */}
        <div className="relative z-10 mx-auto -mt-[10vw] aspect-[1160/690] w-full overflow-hidden rounded-xl sm:w-[min(100%,60vw)] sm:rounded-[1.5vw]">
          <Image
            src={sobre.cozinhaFoto}
            alt="Cozinha da Regadoces"
            fill
            sizes="60vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-marrom" />
          <h2 className={`absolute inset-x-4 bottom-2 text-creme drop-shadow-md sm:bottom-[0.5vw] ${TITULO} text-[clamp(24px,3.2vw,62px)]`}>
            <Linhas texto={sobre.cozinhaTitulo} />
          </h2>
        </div>
        <div className={`mx-auto mt-[clamp(20px,1.6vw,32px)] flex flex-col gap-[clamp(16px,1.4vw,28px)] font-sans text-creme sm:max-w-[48vw] ${TXT}`}>
          {sobre.cozinhaParagrafos.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-[clamp(24px,2.2vw,44px)]">
          <TicketButton
            href="/cardapio-regadoces.pdf"
            target="_blank"
            className="min-w-[min(100%,clamp(280px,24vw,470px))]"
          >
            {sobre.cozinhaBotao}
          </TicketButton>
        </div>
      </section>

      <Drip color="#421a14" className="bg-creme" h={10} />
      <SiteFooter />
    </div>
  );
}
