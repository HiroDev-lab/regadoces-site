import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AddToCartButton from "@/components/AddToCartButton";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import { urlTipo } from "@/components/CatalogoProdutos";
import { getPublicProducts } from "@/lib/db";
import { emPromocao, precoAtual } from "@/lib/preco";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

/*
  Página individual do produto (pedido do Ricardo): foto grande,
  descrição completa e botão de compra. O card do catálogo mostra só
  foto/nome/preço e aponta para cá.
*/

async function buscarProduto(slug: string) {
  const produtos = await getPublicProducts();
  return produtos.find((p) => slugify(p.nome) === slug || p.id === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const produto = await buscarProduto(slug);
  return { title: produto ? `${produto.nome} — Regadoces` : "Regadoces" };
}

export default async function ProdutoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const produto = await buscarProduto(slug);
  if (!produto) notFound();

  const promo = emPromocao(produto);
  const precoFinal = precoAtual(produto);
  const moeda = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="bg-creme">
      <div className="relative">
        <SiteNav variant="claro" />

        <div className="mx-auto max-w-[1100px] px-5 pb-16 pt-44 sm:pt-36">
          <Link
            href={urlTipo(produto.categoria)}
            className="font-sans text-[14px] font-semibold text-marrom hover:underline"
          >
            ← Voltar para {produto.categoria}
          </Link>

          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
            {/* foto grande */}
            <div className="relative aspect-square w-full overflow-hidden rounded-[22px] bg-cinza-card">
              <Image
                src={produto.imagem}
                alt={produto.nome}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 550px"
                className="object-cover"
              />
            </div>

            {/* infos */}
            <div className="flex flex-col">
              <Link
                href={urlTipo(produto.categoria)}
                className="inline-block self-start bg-marrom px-4 py-1.5 font-sans text-[12px] font-semibold tracking-widest text-creme"
              >
                {produto.categoria.toUpperCase()}
              </Link>
              <h1 className="mt-4 font-sans text-3xl font-bold leading-tight text-marrom sm:text-4xl">
                {produto.nome}
              </h1>
              <p className="mt-1 font-sans text-[13px] text-marrom/50">
                Código do produto: {produto.codigo}
              </p>

              {produto.descricao && (
                <p className="mt-5 font-sans text-[16px] leading-relaxed text-marrom/90">
                  {produto.descricao}
                </p>
              )}

              {promo ? (
                <p className="mt-6 font-sans leading-tight">
                  <span className="block text-[16px] text-marrom/60 line-through">
                    {moeda(produto.preco)}
                  </span>
                  <span className="text-3xl font-bold text-vinho">
                    {moeda(precoFinal)}
                  </span>
                </p>
              ) : (
                <p className="mt-6 font-sans text-3xl font-bold text-marrom">
                  {moeda(produto.preco)}
                </p>
              )}

              <div className="mt-6">
                <AddToCartButton
                  produto={{
                    produtoId: produto.id,
                    nome: produto.nome,
                    detalhe: produto.detalhe,
                    descricao: produto.descricao,
                    codigo: produto.codigo,
                    preco: precoFinal,
                    imagem: produto.imagem,
                  }}
                />
              </div>

              <Link
                href="/carrinho"
                className="mt-4 font-sans text-[14px] font-semibold text-vinho hover:underline"
              >
                Ver meu carrinho →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
