import { NextResponse } from "next/server";
import { c6Configured, checkoutFalhou, consultarCheckout, consultarCobranca } from "@/lib/c6bank";
import { readCollection, writeCollection, type Order } from "@/lib/db";
import { notificarPagamentoConfirmado } from "@/lib/notificar";

/*
  Status do pagamento de um pedido (usado pela página /pedido/<id> para
  atualizar sozinha enquanto o cliente paga o Pix).
  Se o Pix ainda está pendente, consulta o C6 e, se já foi pago,
  confirma o pedido aqui mesmo (não depende só do webhook).
*/

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orders = await readCollection<Order>("orders");
  const pedido = orders.find((o) => o.id === id);
  if (!pedido) return NextResponse.json({ erro: "Pedido não encontrado" }, { status: 404 });

  if (
    pedido.pagamento.metodo === "pix" &&
    pedido.pagamento.status === "pendente" &&
    pedido.pagamento.txid &&
    c6Configured()
  ) {
    try {
      const cob = await consultarCobranca(pedido.pagamento.txid);
      if (cob.status === "CONCLUIDA") {
        pedido.pagamento.status = "aprovado";
        if (cob.endToEndId) pedido.pagamento.referencia = cob.endToEndId;
        await writeCollection("orders", orders);
        await notificarPagamentoConfirmado(pedido);
      } else if (cob.status.startsWith("REMOVIDA")) {
        pedido.pagamento.status = "recusado";
        await writeCollection("orders", orders);
      }
    } catch (e) {
      console.error("status pedido: falha ao consultar C6", e);
    }
  }

  // cartão (link de pagamento do C6): confirma no C6 se já foi pago
  if (
    pedido.pagamento.metodo === "cartao" &&
    pedido.pagamento.status === "pendente" &&
    pedido.pagamento.checkoutId &&
    c6Configured()
  ) {
    try {
      const chk = await consultarCheckout(pedido.pagamento.checkoutId);
      if (chk.status === "PAID") {
        pedido.pagamento.status = "aprovado";
        if (chk.cartao?.bandeira) pedido.pagamento.cartaoBandeira = chk.cartao.bandeira;
        if (chk.cartao?.final) pedido.pagamento.cartaoFinal = chk.cartao.final;
        await writeCollection("orders", orders);
        await notificarPagamentoConfirmado(pedido);
      } else if (checkoutFalhou(chk.status)) {
        pedido.pagamento.status = "recusado";
        await writeCollection("orders", orders);
      }
    } catch (e) {
      console.error("status pedido: falha ao consultar checkout C6", e);
    }
  }

  return NextResponse.json({
    status: pedido.pagamento.status,
    metodo: pedido.pagamento.metodo,
    expiraEm: pedido.pagamento.expiraEm ?? null,
    linkPagamento: pedido.pagamento.status === "pendente" ? (pedido.pagamento.linkPagamento ?? null) : null,
  });
}
