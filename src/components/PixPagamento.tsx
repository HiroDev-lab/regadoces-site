"use client";

import { useEffect, useState } from "react";

/*
  Bloco de pagamento Pix da página do pedido: QR code, "copia e cola" com
  botão de copiar e o status, que se atualiza sozinho a cada 6 segundos
  enquanto o pagamento estiver pendente (consulta /api/pedido/<id>/status).
*/
type Props = {
  pedidoId: string;
  copiaECola: string;
  qrDataUrl: string;
  statusInicial: "pendente" | "aprovado" | "recusado";
  expiraEm?: string | null;
};

export default function PixPagamento({ pedidoId, copiaECola, qrDataUrl, statusInicial, expiraEm }: Props) {
  const [status, setStatus] = useState(statusInicial);
  const [copiado, setCopiado] = useState(false);

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
    const t = setInterval(tick, 6000);
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, [pedidoId, status]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(copiaECola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  }

  const validade = expiraEm ? new Date(expiraEm) : null;

  return (
    <div className="mx-auto mt-6 max-w-xl rounded-[22px] border border-vinho/60 bg-branco-quente px-7 py-6 text-left">
      {status === "aprovado" ? (
        <div className="text-center">
          <p className="font-sans text-2xl font-bold text-green-700">Pagamento confirmado ✓</p>
          <p className="mt-2 font-sans text-[15px] text-marrom">
            Recebemos seu Pix. Já estamos preparando o seu Regadoces!
          </p>
        </div>
      ) : status === "recusado" ? (
        <div className="text-center">
          <p className="font-sans text-2xl font-bold text-vinho">Cobrança expirada</p>
          <p className="mt-2 font-sans text-[15px] text-marrom">
            O prazo para pagar este Pix acabou. Faça um novo pedido ou fale com a gente no WhatsApp.
          </p>
        </div>
      ) : (
        <>
          <h3 className="font-sans text-xl font-semibold text-marrom">Pague com Pix para confirmar</h3>
          <p className="mt-1 font-sans text-[14px] text-marrom/70">
            Abra o app do seu banco, escolha <b>Pix → Ler QR code</b> ou use o copia e cola.
            {validade && (
              <>
                {" "}
                Válido até{" "}
                {validade.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.
              </>
            )}
          </p>
          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR code do Pix" width={220} height={220} className="rounded-lg bg-white p-2" />
            <div className="min-w-0 flex-1">
              <p className="font-sans text-[13px] font-semibold text-marrom">Pix copia e cola</p>
              <p className="mt-1 max-h-32 overflow-auto break-all rounded-md bg-creme px-3 py-2 font-mono text-[11px] text-marrom">
                {copiaECola}
              </p>
              <button
                type="button"
                onClick={copiar}
                className="ticket ticket-face mt-3 w-full px-4 py-2 font-sans text-[13px] font-semibold text-marrom transition-[filter] hover:brightness-95"
              >
                {copiado ? "COPIADO ✓" : "COPIAR CÓDIGO PIX"}
              </button>
              <p className="mt-3 flex items-center gap-2 font-sans text-[13px] text-marrom/70">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-vinho" />
                Aguardando pagamento… esta página atualiza sozinha.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
