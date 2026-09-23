"use client";

import { useState } from "react";
import { useCart } from "./CartContext";

/*
  Botão "COMPRE SEUS REGADOCES" da página do produto — mesmo ticket dos
  cards, em tamanho maior. Recebe só os campos que o carrinho precisa
  (o preço já vem calculado com a promoção, quando houver).
*/
export default function AddToCartButton({
  produto,
}: {
  produto: {
    produtoId: string;
    nome: string;
    detalhe: string;
    descricao: string;
    codigo: string;
    preco: number;
    imagem: string;
  };
}) {
  const { addItem } = useCart();
  const [ok, setOk] = useState(false);

  function comprar() {
    addItem(produto);
    setOk(true);
    setTimeout(() => setOk(false), 1400);
  }

  return (
    <button onClick={comprar} className="relative block w-full max-w-[420px]">
      <span className="ticket ticket-face relative block px-8 py-3 text-center font-sans text-[14px] font-bold tracking-wide text-marrom transition-[filter] hover:brightness-95">
        {ok ? "ADICIONADO AO CARRINHO ✓" : "COMPRE SEUS REGADOCES"}
      </span>
    </button>
  );
}
