import { notFound } from "next/navigation";
import CatalogoProdutos, { slugTipo } from "@/components/CatalogoProdutos";
import { getCategoriasPublicas } from "@/lib/db";

export const dynamic = "force-dynamic";

/* /produtos/<tipo> — ex.: /produtos/bolo, /produtos/pudim-sorvete
   (os tipos vêm das categorias visíveis cadastradas no painel) */
export default async function ProdutosPorTipoPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoria: string }>;
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  const { categoria } = await params;
  const { q, pagina } = await searchParams;
  const categorias = await getCategoriasPublicas();
  const tipo = categorias.find((c) => slugTipo(c.nome) === categoria)?.nome;
  if (!tipo) notFound();
  return (
    <CatalogoProdutos
      tipoAtivo={tipo}
      busca={q ?? ""}
      pagina={Number(pagina) || 1}
    />
  );
}
