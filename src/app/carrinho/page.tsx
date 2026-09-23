"use client";

import Image from "next/image";
import CartSummary, { formatBRL } from "@/components/CartSummary";
import CheckoutShell from "@/components/CheckoutShell";
import { useCart } from "@/components/CartContext";
import TicketButton from "@/components/TicketButton";

export default function CarrinhoPage() {
  const { itens, setQuantidade, removeItem } = useCart();

  return (
    <CheckoutShell passo={1}>
      <h1 className="text-center font-sans text-[clamp(28px,2vw,38px)] text-marrom">Seu Carrinho</h1>

      <div className="mt-[max(40px,6vw)] grid grid-cols-1 gap-[max(24px,2vw)] lg:grid-cols-[1.75fr_1fr]">
        <div className="flex flex-col gap-6">
          {itens.length === 0 && (
            <div className="rounded-[22px] border border-vinho/60 bg-branco-quente p-10 text-center">
              <p className="font-sans text-xl text-marrom">
                Seu carrinho está vazio. 🍰
              </p>
              <div className="mt-6">
                <TicketButton href="/produtos" className="min-w-[280px]">
                  VER NOSSOS PRODUTOS
                </TicketButton>
              </div>
            </div>
          )}

          {itens.map((i) => (
            <div
              key={i.produtoId}
              className="relative rounded-[22px] border border-vinho/70 bg-branco-quente px-[max(20px,1.2vw)] py-[max(20px,1.2vw)]"
            >
              <button
                aria-label={`Remover ${i.nome}`}
                onClick={() => removeItem(i.produtoId)}
                className="absolute right-4 top-3 font-sans text-lg font-bold text-vinho hover:opacity-70"
              >
                x
              </button>
              <div className="grid grid-cols-1 items-center gap-[max(20px,1.4vw)] sm:grid-cols-[clamp(130px,14vw,274px)_1fr_1.2fr]">
                <div className="relative aspect-[274/233] w-full overflow-hidden rounded-xl">
                  <Image src={i.imagem} alt={i.nome} fill sizes="130px" className="object-cover" />
                </div>
                <div>
                  <p className="font-sans text-[clamp(20px,1.7vw,33px)] leading-tight text-marrom">{i.nome}</p>
                  <p className="mt-1 font-sans text-[clamp(14px,1.15vw,22px)] text-marrom/50">{i.detalhe}</p>
                  <div className="mt-4 inline-flex items-center overflow-hidden rounded-md bg-creme">
                    <button
                      aria-label="Diminuir quantidade"
                      onClick={() => setQuantidade(i.produtoId, i.quantidade - 1)}
                      className="px-4 py-2 font-sans text-[clamp(16px,1.2vw,23px)] text-marrom hover:bg-marrom/10"
                    >
                      -
                    </button>
                    <span className="border-x border-marrom/20 px-5 py-2 font-sans text-[clamp(16px,1.2vw,23px)] text-marrom/70">
                      {i.quantidade}
                    </span>
                    <button
                      aria-label="Aumentar quantidade"
                      onClick={() => setQuantidade(i.produtoId, i.quantidade + 1)}
                      className="px-4 py-2 font-sans text-[clamp(16px,1.2vw,23px)] text-marrom hover:bg-marrom/10"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <p className="font-sans text-[clamp(13px,0.95vw,18px)] leading-relaxed text-marrom/80">
                    <span className="font-bold">Descrição:</span> {i.descricao}
                  </p>
                  <p className="mt-3 font-sans text-[clamp(13px,0.95vw,18px)] text-marrom">
                    <span className="font-bold">Código do produto:</span> {i.codigo}
                  </p>
                  <p className="mt-2 text-right font-sans text-[clamp(20px,1.4vw,27px)] font-bold text-marrom">
                    {formatBRL(i.preco)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <CartSummary
          passo={1}
          ctaLabel="PRÓXIMO PASSO IDENTIFICAÇÃO"
          ctaHref="/checkout/identificacao"
          ctaDisabled={itens.length === 0}
        />
      </div>
    </CheckoutShell>
  );
}
