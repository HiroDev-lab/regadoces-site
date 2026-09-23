import { NextResponse } from "next/server";
import { c6Configured, checkoutFalhou, consultarCheckout, consultarCobranca } from "@/lib/c6bank";
import { readCollection, writeCollection, type Order } from "@/lib/db";
import { notificarPagamentoConfirmado } from "@/lib/notificar";

/*
  Webhook do C6 Bank. Recebe dois tipos de notificação nesta mesma URL:

  1) Pix recebido — corpo { pix: [{ txid, endToEndId, valor, horario }] }
     (webhook cadastrado com scripts/c6-webhook.mjs).
     SEGURANÇA: não confiamos no corpo recebido — para cada txid, o pedido
     só é marcado como pago depois de CONFIRMAR no próprio C6
     (GET /v2/pix/cob/{txid} com status CONCLUIDA). Assim uma chamada
     falsa não consegue aprovar pedido nenhum.

  2) Checkout (link de pagamento: cartão crédito/débito + Pix) — corpo
     { external_id, date_time, client_id, partner_id, service: "CHECKOUT",
       status: CREATED | PAID | DECLINED | EXPIRED | ..., information: "<json>" }
     (webhook cadastrado com scripts/c6-evidencias-checkout.mjs, service=CHECKOUT).
     A notificação é REGISTRADA na coleção `c6_checkout_events` (evidência
     da homologação) e, se existir um pedido com esse checkoutId, o pedido
     é confirmado — só depois de conferir no C6 que o status é PAID.
*/

export const runtime = "nodejs";

type NotificacaoPix = { pix?: { txid?: string; endToEndId?: string }[] };
type NotificacaoCheckout = {
  service?: string;
  status?: string;
  external_id?: string;
  date_time?: string;
  client_id?: string;
  information?: string;
};
export type CheckoutEvent = {
  id: string;
  recebidoEm: string;
  status: string;
  externalId: string;
  dateTime: string;
  information: unknown;
  raw: unknown;
};

const MAX_EVENTOS = 300;

export async function POST(req: Request) {
  if (!c6Configured()) {
    return NextResponse.json({ ok: false, erro: "C6 não configurado" }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as NotificacaoPix & NotificacaoCheckout;

  // ---- 2) notificação de CHECKOUT: só registra ----
  if (typeof body.service === "string" && body.service.toUpperCase() === "CHECKOUT") {
    let information: unknown = body.information ?? null;
    if (typeof information === "string") {
      try { information = JSON.parse(information); } catch { /* mantém string */ }
    }
    const evento: CheckoutEvent = {
      id: `${body.external_id ?? "sem-id"}:${body.status ?? "?"}:${Date.now()}`,
      recebidoEm: new Date().toISOString(),
      status: String(body.status ?? ""),
      externalId: String(body.external_id ?? ""),
      dateTime: String(body.date_time ?? ""),
      information,
      raw: body,
    };
    const eventos = await readCollection<CheckoutEvent>("c6_checkout_events");
    eventos.push(evento);
    await writeCollection("c6_checkout_events", eventos.slice(-MAX_EVENTOS));

    // pedido pago no cartão? SEGURANÇA: como no Pix, o pedido só muda depois
    // de CONFIRMAR o status no próprio C6 (GET /v1/checkouts/{id}).
    let pedidoAtualizado: string | null = null;
    if (evento.externalId) {
      const orders = await readCollection<Order>("orders");
      const pedido = orders.find(
        (o) => o.pagamento.metodo === "cartao" && o.pagamento.checkoutId === evento.externalId
      );
      if (pedido && pedido.pagamento.status === "pendente") {
        try {
          const chk = await consultarCheckout(evento.externalId);
          if (chk.status === "PAID") {
            pedido.pagamento.status = "aprovado";
            if (chk.cartao?.bandeira) pedido.pagamento.cartaoBandeira = chk.cartao.bandeira;
            if (chk.cartao?.final) pedido.pagamento.cartaoFinal = chk.cartao.final;
            await writeCollection("orders", orders);
            await notificarPagamentoConfirmado(pedido);
            pedidoAtualizado = pedido.id;
          } else if (checkoutFalhou(chk.status)) {
            pedido.pagamento.status = "recusado";
            await writeCollection("orders", orders);
            pedidoAtualizado = pedido.id;
          }
        } catch (e) {
          console.error("webhook C6: falha ao confirmar checkout", evento.externalId, e);
        }
      }
    }
    return NextResponse.json({ ok: true, tipo: "checkout", status: evento.status, pedido: pedidoAtualizado });
  }

  // ---- 1) Pix ----
  const txids = Array.from(
    new Set((body.pix ?? []).map((p) => p.txid).filter((t): t is string => Boolean(t)))
  );
  if (txids.length === 0) return NextResponse.json({ ok: true, processados: 0 });

  const orders = await readCollection<Order>("orders");
  let alterados = 0;
  const confirmados: Order[] = [];
  for (const txid of txids) {
    const pedido = orders.find((o) => o.pagamento.txid === txid);
    if (!pedido || pedido.pagamento.status === "aprovado") continue;
    try {
      const cob = await consultarCobranca(txid);
      if (cob.status === "CONCLUIDA") {
        pedido.pagamento.status = "aprovado";
        if (cob.endToEndId) pedido.pagamento.referencia = cob.endToEndId;
        alterados++;
        confirmados.push(pedido);
      }
    } catch (e) {
      console.error("webhook C6: falha ao confirmar", txid, e);
    }
  }
  if (alterados > 0) await writeCollection("orders", orders);
  for (const p of confirmados) await notificarPagamentoConfirmado(p);
  return NextResponse.json({ ok: true, processados: alterados });
}

/* Alguns provedores testam a URL com GET ao cadastrar o webhook. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
