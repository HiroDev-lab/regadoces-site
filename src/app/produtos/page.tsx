import CatalogoProdutos from "@/components/CatalogoProdutos";

export const dynamic = "force-dynamic";

/* /produtos — todos os produtos (aceita ?q=busca e ?pagina=N) */
export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  const { q, pagina } = await searchParams;
  return (
    <CatalogoProdutos
      tipoAtivo="Todos"
      busca={q ?? ""}
      pagina={Number(pagina) || 1}
    />
  );
}
