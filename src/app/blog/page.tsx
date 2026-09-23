import Image from "next/image";
import Drip from "@/components/Drip";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import { readCollection, type Post } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = (await readCollection<Post>("posts"))
    .filter((p) => p.ativo)
    .sort((a, b) => a.ordem - b.ordem);

  const destaque = posts.find((p) => p.destaque) ?? posts[0];
  const restantes = posts;

  return (
    <div className="bg-azul">
      {/* ============ HERO AZUL ============ */}
      <div className="relative px-5 pb-16 pt-44 text-center sm:pt-28">
        <SiteNav variant="claro" />
        {/* "Blog" gigante como na LP (~270px em 1920) */}
        <h1 className="font-display text-[clamp(110px,14vw,270px)] leading-[0.85] text-creme">
          Blog
        </h1>
        <span className="relative -mt-[1vw] inline-block bg-black/85 px-4 py-1.5 font-sans text-[clamp(12px,0.85vw,16px)] text-white">
          Na Mídia
        </span>

        {destaque && (
          <div className="mx-auto mt-6 max-w-[1140px]">
            <div className="relative aspect-[1140/440] w-full overflow-hidden rounded-[18px]">
              <Image
                src={destaque.capa}
                alt={destaque.titulo}
                fill
                priority
                sizes="(max-width: 900px) 100vw, 900px"
                className="object-cover"
              />
            </div>
            <h2 className="mx-auto mt-[max(24px,2vw)] font-sans text-[clamp(24px,1.9vw,36px)] font-bold leading-snug text-vinho sm:max-w-[40vw]">
              {destaque.titulo}
            </h2>
            <div className="mt-6">
              <ArticleButton slug={destaque.slug} grande />
            </div>
          </div>
        )}
      </div>

      {/* ============ GRADE DE MATÉRIAS (marrom) ============ */}
      <Drip color="#a3b5d3" className="bg-marrom" h={11.5} />
      <section className="bg-marrom px-5 pb-20 pt-[max(24px,6vw)]">
        <div className="mx-auto grid max-w-[1140px] grid-cols-1 gap-x-[36px] gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {restantes.map((p) => (
            <div key={p.id} className="text-center">
              <div className="relative aspect-[356/205] w-full overflow-hidden rounded-md">
                <Image
                  src={p.capa}
                  alt={p.titulo}
                  fill
                  sizes="(max-width: 640px) 100vw, 360px"
                  className="object-cover"
                />
              </div>
              <h3 className="mx-auto mt-4 max-w-[320px] font-sans text-[clamp(15px,0.95vw,18px)] font-bold leading-snug text-[#e8c39a]">
                {p.titulo}
              </h3>
              <div className="mt-3">
                <ArticleButton slug={p.slug} />
              </div>
            </div>
          ))}
        </div>

        {/* foto da cozinha + texto institucional (na seção marrom, como na LP) */}
        <div className="mx-auto mt-[max(48px,8vw)] max-w-[1180px]">
          <div className="relative aspect-[1180/822] w-full overflow-hidden rounded-[2vw]">
            <Image
              src="/images/sobre/cozinha-2.jpg"
              alt="Cozinha da Regadoces"
              fill
              sizes="(max-width: 900px) 100vw, 900px"
              className="object-cover"
            />
          </div>
          <p className="mx-auto mt-[max(28px,2.5vw)] text-center font-sans text-[clamp(15px,1vw,19px)] leading-relaxed text-creme sm:max-w-[58vw]">
            O Regadoces foi criado em outubro de 2019 com a intenção de
            despertar a memória afetiva dos clientes com um doce saboroso e de
            muita qualidade. Desde a nossa inauguração trabalhamos
            incessantemente para expandir a oferta de produtos e tornar a
            experiência do cliente a melhor possível.
          </p>
        </div>
      </section>

      <Drip color="#421a14" className="bg-creme" h={11.5} />
      <SiteFooter />
    </div>
  );
}

function ArticleButton({ slug, grande = false }: { slug: string; grande?: boolean }) {
  return (
    <a href={`/blog/${slug}`} className="relative inline-block">
      {/* camada unica, sem sombra deslocada (padrao do designer) */}
      <span
        className={`ticket ticket-face relative block font-sans font-semibold tracking-wide text-marrom transition-[filter] hover:brightness-95 ${
          grande
            ? "min-w-[min(100%,clamp(300px,26vw,494px))] px-16 py-3 text-[clamp(14px,0.9vw,17px)]"
            : "min-w-[min(100%,14vw)] px-8 py-2 text-[11px] [--cap:6px] [--notch:7px]"
        }`}
      >
        LER A MATÉRIA COMPLETA
      </span>
    </a>
  );
}
