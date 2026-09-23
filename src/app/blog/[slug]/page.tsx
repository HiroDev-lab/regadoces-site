import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Drip from "@/components/Drip";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import { readCollection, type Post } from "@/lib/db";

export const dynamic = "force-dynamic";

/* Página de leitura da matéria (mantém a identidade azul/creme do blog). */
export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const posts = await readCollection<Post>("posts");
  const post = posts.find((p) => p.slug === slug && p.ativo);
  if (!post) notFound();

  return (
    <div className="bg-azul">
      <div className="relative px-5 pb-16 pt-24 sm:pt-28">
        <SiteNav variant="claro" />
        <div className="mx-auto max-w-3xl">
          <Link
            href="/blog"
            className="font-sans text-[14px] font-semibold text-marrom hover:underline"
          >
            ← Voltar para o Blog
          </Link>
          <h1 className="mt-6 font-sans text-3xl font-bold leading-snug text-vinho sm:text-4xl">
            {post.titulo}
          </h1>
          <div className="relative mt-8 h-[260px] w-full overflow-hidden rounded-[18px] sm:h-[400px]">
            <Image
              src={post.capa}
              alt={post.titulo}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 900px"
              className="object-cover"
            />
          </div>
          <div className="mt-8 flex flex-col gap-5">
            {post.conteudo.split("\n\n").map((par, i) => (
              <p key={i} className="font-sans text-[17px] leading-relaxed text-marrom">
                {par}
              </p>
            ))}
          </div>
        </div>
      </div>
      <Drip color="#a3b5d3" className="bg-creme" />
      <SiteFooter />
    </div>
  );
}
