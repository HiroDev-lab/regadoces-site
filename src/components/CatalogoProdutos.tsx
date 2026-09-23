import Link from "next/link";
import Drip from "@/components/Drip";
import ProductCard from "@/components/ProductCard";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import { getCategoriasPublicas, getPublicProducts } from "@/lib/db";

/*
  Página de produtos (LP "Páginas de produtos") com filtro por tipo.
  URLs bonitas: /produtos (todos) e /produtos/<tipo>, ex.: /produtos/bolo,
  /produtos/pudim-sorvete, /produtos/brigadeirao.
  Os tipos vêm do painel (menu Categorias): criar/renomear/ordenar/ocultar.
*/

/** "Pudim/Sorvete" → "pudim-sorvete", "Brigadeirão" → "brigadeirao" */
export function slugTipo(tipo: string): string {
  return tipo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function urlTipo(tipo: string): string {
  return tipo === "Todos" ? "/produtos" : `/produtos/${slugTipo(tipo)}`;
}

/** por página (pedido do Ricardo: sem rolagem infinita; 15 fecha
    certinho as 5 fileiras de 3 colunas do desktop, sem buraco) */
const POR_PAGINA = 15;

/** busca sem acento e sem caixa: "limao" acha "Limão" */
function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default async function CatalogoProdutos({
  tipoAtivo,
  busca = "",
  pagina = 1,
}: {
  tipoAtivo: string;
  busca?: string;
  pagina?: number;
}) {
  const [produtos, categorias] = await Promise.all([
    getPublicProducts(),
    getCategoriasPublicas(),
  ]);
  const tipos = categorias.map((c) => c.nome);
  const porTipo =
    tipoAtivo === "Todos"
      ? produtos
      : produtos.filter((p) => p.categoria.toLowerCase() === tipoAtivo.toLowerCase());
  const q = normalizar(busca.trim());
  const filtrados = q
    ? porTipo.filter((p) => normalizar(p.nome).includes(q) || p.codigo === q)
    : porTipo;

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(Math.max(1, pagina), totalPaginas);
  const daPagina = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const caminho = urlTipo(tipoAtivo);
  const urlPagina = (n: number) => {
    const p = new URLSearchParams();
    if (busca.trim()) p.set("q", busca.trim());
    if (n > 1) p.set("pagina", String(n));
    const qs = p.toString();
    return `${caminho}${qs ? `?${qs}` : ""}#cardapio`;
  };

  return (
    <div className="bg-creme">
      <div className="relative min-h-screen">
        {/* camadas de fundo: creme → vinho → marrom com caldas (como na LP) */}
        <div aria-hidden className="absolute inset-0 flex flex-col">
          <div className="h-[45%] min-h-[1100px] bg-creme" />
          <div className="bg-vinho">
            <Drip color="#f7e6d5" h={19} />
          </div>
          <div className="flex-1 bg-vinho" />
          <div className="bg-marrom">
            <Drip color="#720f23" h={19} />
          </div>
          <div className="h-[16%] bg-marrom" />
        </div>

        <div className="relative">
          <SiteNav variant="claro" />

          {/* medidas da LP (1920px): filtro a 5,4% da borda, grade de cards de 20,8% a 80% */}
          <div
            id="cardapio"
            className="grid grid-cols-1 gap-10 px-5 pb-24 pt-28 md:ml-[5.4vw] md:mr-[20vw] md:grid-cols-[15.4vw_1fr] md:gap-0 md:px-0"
          >
            {/* ---- Filtro lateral ---- */}
            <aside className="md:pt-[7vw] md:pr-[2vw]">
              <h1 className="font-sans text-[clamp(32px,2.9vw,56px)] font-bold leading-none text-marrom">Filtrar</h1>
              {/* busca por nome (pedido do Ricardo — igual à do painel) */}
              <form action={caminho} className="mt-[max(16px,1.4vw)]">
                <div className="flex overflow-hidden rounded-full border border-marrom/40 bg-white/70">
                  <input
                    type="search"
                    name="q"
                    defaultValue={busca}
                    placeholder="Buscar produto..."
                    className="w-full bg-transparent px-4 py-2 font-sans text-[15px] text-marrom outline-none placeholder:text-marrom/50"
                  />
                  <button
                    type="submit"
                    aria-label="Buscar"
                    className="px-4 font-sans text-[15px] text-marrom transition-opacity hover:opacity-70"
                  >
                    🔍
                  </button>
                </div>
              </form>
              <div className="mt-[max(16px,1.4vw)] h-px w-full bg-marrom/60" />
              <div className="mt-[max(16px,1.4vw)] flex items-center justify-between">
                <h2 className="font-sans text-[clamp(18px,1.35vw,26px)] font-bold text-marrom">Tipos</h2>
                <span aria-hidden className="text-[clamp(18px,1.35vw,26px)] text-marrom">—</span>
              </div>
              <ul className="mt-[max(14px,1.2vw)] flex flex-row flex-wrap gap-x-5 gap-y-3 md:flex-col md:gap-y-[1.1vw]">
                {["Todos", ...tipos].map((t) => (
                  <li key={t}>
                    <Link
                      href={urlTipo(t)}
                      className={`font-sans text-[clamp(17px,1.35vw,26px)] text-marrom transition-opacity hover:opacity-70 ${
                        t === tipoAtivo ? "font-bold underline underline-offset-4" : ""
                      }`}
                    >
                      {t}
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>

            {/* ---- Grade de produtos ---- */}
            <div>
              {busca.trim() && (
                <p className="mb-5 font-sans text-[15px] text-marrom">
                  {filtrados.length === 0
                    ? <>Nenhum produto encontrado para “{busca.trim()}”.</>
                    : <>{filtrados.length} resultado{filtrados.length === 1 ? "" : "s"} para “{busca.trim()}” — <Link href={caminho} className="font-semibold underline">limpar busca</Link></>}
                </p>
              )}
              {filtrados.length === 0 ? (
                !busca.trim() && (
                  <p className="pt-20 text-center font-sans text-xl text-marrom">
                    Nenhum produto disponível nesse tipo no momento.
                  </p>
                )
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-[2vw] sm:gap-y-[3vw] lg:grid-cols-3 2xl:grid-cols-4">
                    {daPagina.map((p) => (
                      <ProductCard key={p.id} produto={p} />
                    ))}
                  </div>

                  {/* paginação — 20 por página (pedido do Ricardo) */}
                  {totalPaginas > 1 && (
                    <nav
                      aria-label="Páginas de produtos"
                      className="mt-12 flex flex-wrap items-center justify-center gap-2 font-sans text-[15px]"
                    >
                      {/* bolinhas em creme (pedido do Ricardo): a paginação
                          cai na faixa vinho/marrom do fundo */}
                      {paginaAtual > 1 && (
                        <Link
                          href={urlPagina(paginaAtual - 1)}
                          className="rounded-full border border-marrom/30 bg-creme px-4 py-1.5 text-marrom transition-opacity hover:opacity-80"
                        >
                          ← Anterior
                        </Link>
                      )}
                      {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                        <Link
                          key={n}
                          href={urlPagina(n)}
                          aria-current={n === paginaAtual ? "page" : undefined}
                          className={`flex h-9 w-9 items-center justify-center rounded-full transition-opacity hover:opacity-80 ${
                            n === paginaAtual
                              ? "bg-vinho font-bold text-creme ring-2 ring-creme/80"
                              : "border border-marrom/30 bg-creme text-marrom"
                          }`}
                        >
                          {n}
                        </Link>
                      ))}
                      {paginaAtual < totalPaginas && (
                        <Link
                          href={urlPagina(paginaAtual + 1)}
                          className="rounded-full border border-marrom/30 bg-creme px-4 py-1.5 text-marrom transition-opacity hover:opacity-80"
                        >
                          Próxima →
                        </Link>
                      )}
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-creme">
        <Drip color="#421a14" h={10} />
      </div>
      <SiteFooter />
    </div>
  );
}
