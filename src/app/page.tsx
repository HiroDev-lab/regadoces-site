import Image from "next/image";
import Link from "next/link";
import Drip from "@/components/Drip";
import FaqAccordion from "@/components/FaqAccordion";
import HeroCarousel from "@/components/HeroCarousel";
import ProductCard from "@/components/ProductCard";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import TicketButton from "@/components/TicketButton";
import { urlTipo } from "@/components/CatalogoProdutos";
import AvaliacoesGoogle, { Estrelas, LogoGoogle } from "@/components/AvaliacoesGoogle";
import {
  getCategoriasPublicas,
  getGoogleInfo,
  getPublicProducts,
  getFaq,
  readCollection,
  type Slide,
  type Testimonial,
} from "@/lib/db";

export const dynamic = "force-dynamic";

const FAIXA = [
  "BROWNIES",
  "TORTAS",
  "BOLOS",
  "PAVES",
  "PUDIM",
  "PALHA ITALIANA",
  "BRIGADEIRÃO",
];

export default async function Home() {
  const [slides, produtos, faq, depoimentos, categoriasTodas, google] = await Promise.all([
    readCollection<Slide>("carousel"),
    getPublicProducts(),
    getFaq(),
    readCollection<Testimonial>("testimonials"),
    getCategoriasPublicas(),
    getGoogleInfo(),
  ]);
  // ícones redondos: só as categorias visíveis que têm foto (ordem do painel)
  const categoriasIcones = categoriasTodas.filter((c) => c.imagem);

  const posts = (await readCollection<{
    id: string;
    titulo: string;
    capa: string;
    ordem: number;
    ativo: boolean;
    slug: string;
  }>("posts"))
    .filter((p) => p.ativo)
    .sort((a, b) => a.ordem - b.ordem)
    .slice(0, 3);

  return (
    <div className="bg-creme">
      {/* ============ HERO / CARROSSEL ============ */}
      <div className="relative">
        <SiteNav />
        <HeroCarousel slides={slides} />
      </div>

      {/* faixa de categorias (vinho, letras creme + ✦ azul) — carrossel em loop */}
      <div className="overflow-hidden bg-vinho py-5 sm:py-6">
        <div className="marquee flex w-max items-center">
          {[0, 1].map((rep) => (
            <div
              key={rep}
              aria-hidden={rep === 1}
              className="flex shrink-0 items-center gap-8 pr-8 sm:gap-10 sm:pr-10"
            >
              {FAIXA.map((c) => (
                <span key={c} className="flex items-center gap-8 sm:gap-10">
                  <span className="whitespace-nowrap font-display text-2xl tracking-wide text-creme sm:text-[34px]">
                    {c}
                  </span>
                  <span aria-hidden className="text-2xl text-azul">
                    ✦
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <Drip color="#720f23" h={8.5} />

      {/* ============ NOSSOS PRODUTOS (categorias) ============ */}
      <section className="px-5 pb-6 pt-2 text-center">
        <h2 className="font-display text-5xl text-vinho sm:text-6xl">
          Nossos produtos
        </h2>
        <div className="mx-auto mt-10 flex max-w-7xl flex-wrap items-start justify-center gap-4 sm:gap-5">
          {categoriasIcones.map((c) => (
            <Link
              key={c.id}
              href={urlTipo(c.nome)}
              className="group flex w-[88px] flex-col items-center gap-2 sm:w-[104px]"
            >
              <span className="relative block h-[88px] w-[88px] overflow-hidden rounded-2xl transition-transform group-hover:scale-105 sm:h-[104px] sm:w-[104px]">
                <Image src={c.imagem} alt={c.nome} fill sizes="104px" className="object-cover" />
              </span>
              <span className="font-sans text-[13px] text-marrom">{c.nome}</span>
            </Link>
          ))}
        </div>
        <div className="mt-10">
          <TicketButton href="/produtos" className="min-w-[300px] sm:min-w-[420px]">
            VER TODOS OS PRODUTOS
          </TicketButton>
        </div>
      </section>

      {/* ============ CARDÁPIO ============ */}
      {/* na LP a 2a fileira de cards fica POR CIMA da calda creme que escorre
          sobre a secao marrom — por isso a secao tem z-10 e a calda sobe (overlap) */}
      <section id="cardapio" className="relative z-10 px-5 pt-10 text-center">
        <h2 className="font-display text-5xl text-vinho sm:text-6xl">Cardápio</h2>
        <div className="mx-auto mt-10 grid max-w-[1160px] grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-[40px] sm:gap-y-10 lg:grid-cols-4">
          {produtos.slice(0, 8).map((p) => (
            <ProductCard key={p.id} produto={p} />
          ))}
        </div>
      </section>

      {/* ============ ENCOMENDAS (banner marrom) ============ */}
      <Drip color="#f7e6d5" className="bg-marrom" h={14} overlap="-19vw" />
      <section className="bg-marrom px-5 pb-20 pt-[max(60px,8vw)]">
        <div className="mb-[max(40px,4vw)] text-center">
          <TicketButton href="/produtos" className="min-w-[300px] sm:min-w-[420px]">
            VER TODOS OS PRODUTOS
          </TicketButton>
        </div>
        <div className="mx-auto max-w-[1140px] text-center">
          {/* foto com degradê marrom na base e o título por cima dela, como na LP */}
          <div className="relative mx-auto h-[360px] w-full overflow-hidden rounded-[8px] sm:h-[440px]">
            <Image
              src="/images/hero/mesa-eventos.jpg"
              alt="Mesa de doces para eventos"
              fill
              sizes="(max-width: 1140px) 100vw, 1140px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-marrom" />
            <h2 className="absolute inset-x-4 bottom-2 font-display text-3xl leading-tight text-creme drop-shadow-md sm:text-[42px]">
              Encomendas para festas,
              <br />
              eventos e momentos especiais
            </h2>
          </div>
          <p className="mx-auto mt-5 max-w-2xl font-sans text-[17px] leading-relaxed text-creme">
            Está planejando uma festa ou evento? Conheça como funcionam as
            encomendas da Regadoces e descubra os produtos disponíveis para
            tornar o seu momento ainda mais especial.
          </p>
          <div className="mt-7">
            <TicketButton href="/encomendas" className="min-w-[300px] sm:min-w-[420px]">
              CONHECER AS ENCOMENDAS
            </TicketButton>
          </div>
        </div>
      </section>

      {/* ============ COMO COMPRAR ============ */}
      <Drip color="#421a14" className="bg-creme" h={10} />
      <section id="como-comprar" className="bg-creme px-5 pb-16 pt-4 text-center">
        <h2 className="font-display text-4xl text-marrom sm:text-5xl">
          Como comprar seu Regadoces
        </h2>
        <div className="mx-auto mt-10 max-w-3xl rounded-[40px] bg-gradient-to-b from-white/50 to-marrom/10 px-8 py-12 shadow-sm sm:px-16">
          {[
            ["1. Escolha", "Encontre seu Regadoces em seus produtos ou no cardápio."],
            ["2. Adicione ao carrinho", "Escolha a quantidade e monte seu pedido."],
            ["3. Finalize", "Informe seus dados e escolha a forma de pagamento."],
            ["4. Aproveite", "Agora é só esperar seu Regadoces chegar!"],
          ].map(([t, d]) => (
            <div key={t} className="mb-10 last:mb-0">
              <h3 className="font-sans text-3xl text-vinho sm:text-4xl">{t}</h3>
              <p className="mt-3 font-sans text-[17px] text-marrom">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <TicketButton href="/produtos" className="min-w-[300px] sm:min-w-[420px]">
            QUERO ESCOLHER MEU REGADOCES
          </TicketButton>
        </div>
      </section>

      {/* ============ AVALIAÇÕES DO GOOGLE ============ */}
      <Drip color="#f7e6d5" className="bg-vinho" h={9} />
      <section id="depoimentos" className="bg-vinho px-5 pb-16 pt-4">
        <h2 className="flex items-center justify-center gap-3 text-center font-display text-4xl leading-tight text-creme sm:text-5xl">
          <LogoGoogle className="h-9 w-9 sm:h-11 sm:w-11" />
          Avaliações do Google
        </h2>
        <p className="mt-3 text-center font-sans text-[17px] text-creme">
          <Estrelas nota={google.nota} className="text-[20px]" />{" "}
          <b>{google.nota.toFixed(1).replace(".", ",")}</b>
          {google.total > 0 && <> ({google.total} avaliações no Google)</>}
        </p>
        <div className="mt-12">
          <AvaliacoesGoogle
            avaliacoes={depoimentos
              .filter((d) => d.aprovado)
              .map((d) => ({
                id: d.id,
                nome: d.nome,
                sobrenome: d.sobrenome,
                texto: d.texto,
                nota: d.nota ?? 5,
              }))}
          />
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/depoimentos"
            className="font-sans text-[15px] font-semibold text-creme underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            Ver todas as avaliações →
          </Link>
        </div>
      </section>

      {/* ============ NA MÍDIA - BLOG ============ */}
      <Drip color="#720f23" className="bg-creme" h={9} />
      <section className="bg-creme px-5 pb-16 pt-4 text-center">
        <h2 className="font-display text-4xl text-vinho sm:text-5xl">
          Na mídia - Blog
        </h2>
        <p className="mt-3 font-sans text-[17px] text-marrom">
          Novidades, histórias, dicas e tudo que acontece por aqui.
        </p>
        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-3">
          {posts.map((p) => (
            <Link
              key={p.id}
              href="/blog"
              className="group relative block h-[200px] overflow-hidden rounded-md"
            >
              <Image
                src={p.capa}
                alt={p.titulo}
                fill
                sizes="(max-width: 640px) 100vw, 380px"
                className="object-cover transition-transform group-hover:scale-105"
              />
            </Link>
          ))}
        </div>
        <div className="mt-10">
          <TicketButton href="/blog" className="min-w-[300px] sm:min-w-[420px]">
            VER TODAS AS MATÉRIAS
          </TicketButton>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <Drip color="#f7e6d5" className="bg-vinho" h={9.5} />
      <section id="faq" className="bg-vinho px-5 pb-24 pt-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 md:grid-cols-[1fr_1.3fr]">
          <div>
            <h2 className="font-display text-6xl text-creme">FAQ</h2>
            <p className="mt-2 font-sans text-4xl text-creme sm:text-5xl">
              Perguntas
              <br />
              Frequentes
            </p>
            <p className="mt-8 font-sans text-2xl text-creme">
              Dúvidas? A gente
              <br />
              desenrola.
            </p>
            <div className="mt-6 h-px w-72 max-w-full bg-azul" />
            <div className="mt-10">
              <TicketButton
                href="https://wa.me/5541985222525"
                className="min-w-[300px]"
              >
                AINDA TEM DÚVIDAS? FALE COM A GENTE
              </TicketButton>
            </div>
          </div>
          <FaqAccordion
            itens={faq.filter((f) => f.ativo)}
          />
        </div>
      </section>

      {/* na LP o FAQ termina reto no rodape (sem calda) */}
      <SiteFooter />
    </div>
  );
}
