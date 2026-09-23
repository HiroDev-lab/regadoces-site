"use client";

import { useEffect, useState } from "react";

/*
  Botão de WhatsApp da página do pedido: abre a conversa com o Ricardo
  já com o resumo do pedido preenchido (itens, total, entrega e nome).
  A linha de pagamento acompanha o status do Pix — a página fica aberta
  enquanto o cliente paga, então o botão consulta o mesmo endpoint de
  status que o PixPagamento até a confirmação chegar.
*/
export default function WhatsAppPedidoButton({
  pedidoId,
  statusInicial,
  metodo,
  corpo,
  rodape,
}: {
  pedidoId: string;
  statusInicial: "pendente" | "aprovado" | "recusado";
  metodo: "pix" | "cartao";
  corpo: string;
  rodape: string;
}) {
  const [status, setStatus] = useState(statusInicial);

  useEffect(() => {
    if (status !== "pendente") return; // Pix ou cartão (link do C6) aguardando
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/pedido/${pedidoId}/status`);
        if (r.ok) {
          const d = await r.json();
          if (d.status && d.status !== "pendente") setStatus(d.status);
        }
      } catch {
        /* tenta de novo no próximo intervalo */
      }
    }, 8000);
    return () => clearInterval(t);
  }, [pedidoId, metodo, status]);

  const pagamento =
    metodo === "pix"
      ? status === "aprovado"
        ? "Pagamento: pago via Pix ✅"
        : status === "recusado"
          ? "Pagamento: não concluído"
          : "Pagamento: Pix aguardando confirmação ⏳"
      : status === "aprovado"
        ? "Pagamento: pago no cartão ✅"
        : status === "recusado"
          ? "Pagamento: cartão não concluído"
          : "Pagamento: cartão aguardando confirmação ⏳";

  const numero = process.env.NEXT_PUBLIC_WHATSAPP ?? "5541985222525";
  const texto = `${corpo}\n${pagamento}\n\n${rodape}`;

  return (
    <a
      href={`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="relative mt-4 inline-block min-w-[320px]"
    >
      <span className="ticket ticket-face relative block px-10 py-3 font-sans text-[14px] font-bold tracking-wide text-marrom transition-[filter] hover:brightness-95">
        FALE COM A REGADOCES NO WHATSAPP
      </span>
    </a>
  );
}
