"use client";

import { useEffect, useState } from "react";

/*
  Bloco de pagamento com cartão da página do pedido (API de Checkout do C6).
  O cliente normalmente já foi levado para a página de pagamento do C6 logo
  depois de finalizar o pedido; este bloco cobre quem voltou antes de pagar
  (botão para abrir o link de novo) e mostra o status, que se atualiza
  sozinho a cada 6 segundos enquanto o pagamento estiver pendente
  (consulta /api/pedido/<id>/status, que confere no C6).
*/
type Props = {
  pedidoId: string;
  tipoCartao: "credito" | "debito";
  linkPagamento?: string | null;
  statusInicial: "pendente" | "aprovado" | "recusado";
  cartaoBandeira?: string | null;
  cartaoFinal?: string | null;
};

export default function CartaoPagamento({
  pedidoId,
  tipoCartao,
  linkPagamento,
  statusInicial,
  cartaoBandeira,
  cartaoFinal,
}: Props) {
  const [status, setStatus] = useState(statusInicial);

  useEffect(() => {
    if (status !== "pendente") return;
    let ativo = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/pedido/${encodeURIComponent(pedidoId)}/status`, { cache: "no-store" });
        const j = await r.json();
        if (ativo && j.status && j.status !== "pendente") setStatus(j.status);
      } catch {}
    };
    tick();
    const t = setInterval(tick, 6000);
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, [pedidoId, status]);

  const nomeTipo = tipoCartao === "debito" ? "cartão de débito" : "cartão de crédito";
  const detalheCartao = [cartaoBandeira, cartaoFinal ? `final ${cartaoFinal}` : ""].filter(Boolean).join(" ");

  return (
    <div className="mx-auto mt-6 max-w-xl rounded-[22px] border border-vinho/60 bg-branco-quente px-7 py-6 text-left">
      {status === "aprovado" ? (
        <div className="text-center">
          <p className="font-sans text-2xl font-bold text-green-700">Pagamento confirmado ✓</p>
          <p className="mt-2 font-sans text-[15px] text-marrom">
            Recebemos seu pagamento no {nomeTipo}
            {detalheCartao ? ` (${detalheCartao})` : ""}. Já estamos preparando o seu Regadoces!
          </p>
        </div>
      ) : status === "recusado" ? (
        <div className="text-center">
          <p className="font-sans text-2xl font-bold text-vinho">Pagamento não concluído</p>
          <p className="mt-2 font-sans text-[15px] text-marrom">
            O pagamento no {nomeTipo} não foi aprovado ou o prazo acabou. Faça um novo pedido
            (você pode escolher Pix) ou fale com a gente no WhatsApp.
          </p>
        </div>
      ) : (
        <>
          <h3 className="font-sans text-xl font-semibold text-marrom">Pague com {nomeTipo} para confirmar</h3>
          <p className="mt-1 font-sans text-[14px] text-marrom/70">
            O pagamento é feito na página segura do C6 Bank. Se ela não abriu, ou se você voltou antes de
            concluir, clique no botão abaixo. Seu cartão nunca passa pelo nosso site.
          </p>
          {linkPagamento && (
            <a
              href={linkPagamento}
              className="ticket ticket-face mt-4 block w-full px-4 py-3 text-center font-sans text-[14px] font-bold text-marrom transition-[filter] hover:brightness-95"
            >
              ABRIR PÁGINA DE PAGAMENTO
            </a>
          )}
          <p className="mt-3 flex items-center gap-2 font-sans text-[13px] text-marrom/70">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-vinho" />
            Aguardando pagamento… esta página atualiza sozinha.
          </p>
        </>
      )}
    </div>
  );
}
