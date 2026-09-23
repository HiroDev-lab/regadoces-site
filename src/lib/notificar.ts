import type { Order } from "@/lib/db";

/*
  Notificação de venda no celular do Ricardo (pedido dele: "igual o
  iFood toca"). Usa o ntfy.sh — serviço gratuito de push: o Ricardo
  instala o app "ntfy" e assina o tópico secreto (env NTFY_TOPIC);
  cada POST aqui vira uma notificação com som no telefone.
  Sem NTFY_TOPIC configurado, não faz nada (dev local fica quieto).

  A notificação SEMPRE diz a forma de pagamento do pedido:
  "Pix", "Cartão de crédito" ou "Cartão de débito" (e, depois de pago
  no cartão, a bandeira e o final do cartão que o C6 devolve).
*/

async function enviar(titulo: string, mensagem: string, tags: string[]) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;
  try {
    await fetch("https://ntfy.sh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        title: titulo,
        message: mensagem,
        priority: 5, // urgente = som mesmo em "não perturbe" (configurável no app)
        tags,
        click: "https://regadoces.com.br/painel/pedidos",
      }),
      signal: AbortSignal.timeout(6000),
    });
  } catch (e) {
    console.error("notificar: falha ao enviar push", e);
  }
}

const moeda = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

/** Nome da forma de pagamento como o Ricardo lê: "Pix", "Cartão de crédito", "Cartão de débito". */
export function nomeFormaPagamento(pagamento: Order["pagamento"]): string {
  if (pagamento.metodo === "pix") return "Pix";
  if (pagamento.tipoCartao === "debito") return "Cartão de débito";
  if (pagamento.tipoCartao === "credito") return "Cartão de crédito";
  return "Cartão";
}

/** Forma de pagamento + detalhe (bandeira/final do cartão, quando o C6 já informou). */
export function detalhePagamento(pagamento: Order["pagamento"]): string {
  const nome = nomeFormaPagamento(pagamento);
  if (pagamento.metodo === "cartao") {
    const extras = [pagamento.cartaoBandeira, pagamento.cartaoFinal ? `final ${pagamento.cartaoFinal}` : ""]
      .filter(Boolean)
      .join(" ");
    return extras ? `${nome} (${extras})` : nome;
  }
  return nome;
}

const rotuloStatus: Record<Order["pagamento"]["status"], string> = {
  pendente: "aguardando pagamento",
  aprovado: "pago",
  recusado: "recusado",
};

function resumo(pedido: Order): string {
  const itens = pedido.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", ");
  const entrega =
    pedido.entrega.tipo === "entrega"
      ? `Entrega: ${pedido.entrega.bairro}, ${pedido.entrega.cidade}`
      : "Retirada no local";
  const pagamento = `Pagamento: ${detalhePagamento(pedido.pagamento)} — ${rotuloStatus[pedido.pagamento.status]}`;
  return `${pedido.cliente.nome} ${pedido.cliente.sobrenome} — ${itens}\n${pagamento}\n${entrega}\n${pedido.id}`;
}

/** Novo pedido criado no checkout. */
export function notificarNovoPedido(pedido: Order): Promise<void> {
  const forma = nomeFormaPagamento(pedido.pagamento).toLowerCase().replace(/^pix$/, "Pix");
  const pago = pedido.pagamento.status === "aprovado";
  const sufixo = pago ? `pago no ${forma}` : `aguardando ${forma}`;
  return enviar(
    `🛒 Novo pedido — ${moeda(pedido.total)} (${sufixo})`,
    resumo(pedido),
    ["bell", "shopping_trolley"]
  );
}

/** Pagamento (Pix ou cartão) de um pedido existente acabou de ser confirmado. */
export function notificarPagamentoConfirmado(pedido: Order): Promise<void> {
  const emoji = pedido.pagamento.metodo === "pix" ? "💰" : "💳";
  return enviar(
    `${emoji} ${nomeFormaPagamento(pedido.pagamento)} confirmado — ${moeda(pedido.total)}`,
    resumo(pedido),
    [pedido.pagamento.metodo === "pix" ? "moneybag" : "credit_card"]
  );
}
