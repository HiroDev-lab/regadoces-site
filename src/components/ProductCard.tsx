"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "./CartContext";
import { emPromocao, precoAtual } from "@/lib/preco";
import { slugify } from "@/lib/slug";
import type { Product } from "@/lib/db";

/*
  Card de produto cinza com a base "derretida" OFICIAL do designer
  (classe .card-calda em globals.css → public/images/drips/card-base.svg)
  + botão azul "COMPRE SEUS REGADOCES".
  Versão "clean" pedida pelo Ricardo (31/08, referência = site antigo na
  Wix): só foto, nome (máx. 2 linhas) e preço — a descrição fica na
  página do produto (/produto/<slug>), aberta clicando na foto ou nome.
*/
export default function ProductCard({ produto }: { produto: Product }) {
  const { addItem } = useCart();
  const [ok, setOk] = useState(false);

  const promo = emPromocao(produto);
  const precoFinal = precoAtual(produto);

  function comprar() {
    addItem({
      produtoId: produto.id,
      nome: produto.nome,
      detalhe: produto.detalhe,
      descricao: produto.descricao,
      codigo: produto.codigo,
      preco: precoFinal,
      imagem: produto.imagem,
    });
    setOk(true);
    setTimeout(() => setOk(false), 1400);
  }

  const url = `/produto/${slugify(produto.nome)}`;

  return (
    <div className="card-calda relative flex h-full w-full flex-col overflow-hidden rounded-t-[22px] bg-cinza-card pb-[96px]">
      {/* foto de borda a borda no topo do card; clicar abre a página do produto */}
      <Link href={url} className="relative block aspect-square w-full overflow-hidden">
        <Image
          src={produto.imagem}
          alt={produto.nome}
          fill
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 300px"
          className="object-cover transition-transform duration-300 hover:scale-[1.03]"
        />
      </Link>
      <div className="flex flex-1 flex-col px-3 pt-3 text-center sm:px-5">
        {/* nome limitado a 2 linhas (cards todos da mesma altura); o
            title mostra o nome completo no hover */}
        <Link href={url} title={produto.nome} className="hover:underline">
          <p className="line-clamp-2 min-h-[2.6em] font-sans text-[15px] leading-[1.3] text-marrom">
            {produto.nome}
          </p>
        </Link>
        {promo ? (
          <p className="mt-1 font-sans leading-tight">
            <span className="mr-2 text-[13px] text-marrom/60 line-through">
              R$ {produto.preco.toFixed(2).replace(".", ",")}
            </span>
            <span className="text-lg font-bold text-vinho">
              R$ {precoFinal.toFixed(2).replace(".", ",")}
            </span>
          </p>
        ) : (
          <p className="mt-1 font-sans text-lg font-medium text-marrom">
            R$ {produto.preco.toFixed(2).replace(".", ",")}
          </p>
        )}
        {/* botão menor que o card (margem de respiro), recortes menores e texto sem espaçamento extra para caber inteiro */}
        <button onClick={comprar} className="relative mx-auto mt-auto block w-[90%] pt-2">
          <span className="ticket ticket-face relative block whitespace-normal px-2 py-1.5 font-sans text-[9px] font-semibold leading-tight tracking-normal text-marrom transition-[filter] [--cap:6px] [--notch:7px] hover:brightness-95 sm:px-4 sm:text-[10px]">
            {ok ? "ADICIONADO ✓" : "COMPRE SEUS REGADOCES"}
          </span>
        </button>
      </div>
    </div>
  );
}
