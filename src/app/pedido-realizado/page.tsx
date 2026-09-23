import Link from "next/link";
import QRCode from "qrcode";
import CartaoPagamento from "@/components/CartaoPagamento";
import PixPagamento from "@/components/PixPagamento";
import CheckoutShell from "@/components/CheckoutShell";
import WhatsAppPedidoButton from "@/components/WhatsAppPedidoButton";
import { readCollection, type Order } from "@/lib/db";

export const dynamic = "force-dynamic";

/*
  Página "Pedido Realizado com Sucesso" (reconstruída a partir dos
  assets do zip "pedido realziado" — o PDF continha apenas o fundo).
*/
export default async function PedidoRealizadoPage({
  params,
  searchParams,
}: {
  params?: Promise<{ id?: string }>;
  searchParams?: Promise<{ id?: string }>;
}) {
  const id = (await params)?.id ?? (await searchParams)?.id;
  const orders = await readCollection<Order>("orders");
  const pedido = id ? orders.find((o) => o.id === id) : undefined;
  const copiaECola = pedido?.pagamento.copiaECola ?? (pedido?.pagamento.metodo === "pix" ? pedido.pagamento.referencia : "");
  const qrDataUrl = copiaECola ? await QRCode.toDataURL(copiaECola, { margin: 1, width: 440 }) : "";

  // Mensagem pré-pronta do WhatsApp com o resumo do pedido (a linha de
  // pagamento fica por conta do WhatsAppPedidoButton, que acompanha o Pix)
  const moeda = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const zapCorpo = pedido
    ? [
        `Olá! Fiz o pedido *${pedido.id}* no site da Regadoces 🍰`,
        "",
        ...pedido.itens.map((i) => `${i.quantidade}x ${i.nome} — ${moeda(i.preco * i.quantidade)}`),
        pedido.entrega.tipo === "entrega" ? `Frete: ${moeda(pedido.frete)}` : "Frete: grátis (retirada)",
        ...(pedido.desconto > 0
          ? [`Desconto: -${moeda(pedido.desconto)}${pedido.cupom ? ` (cupom ${pedido.cupom})` : ""}`]
          : []),
        `*Total: ${moeda(pedido.total)}*`,
      ].join("\n")
    : "";
  const zapRodape = pedido
    ? (pedido.entrega.tipo === "entrega"
        ? `Entrega: ${pedido.entrega.endereco}, ${pedido.entrega.numero}${
            pedido.entrega.complemento ? ` - ${pedido.entrega.complemento}` : ""
          }, ${pedido.entrega.bairro}, ${pedido.entrega.cidade}/${pedido.entrega.estado} — CEP ${pedido.entrega.cep}`
        : "Retirada no local (Batel)") +
      `\nNome: ${pedido.cliente.nome} ${pedido.cliente.sobrenome}`
    : "";

  return (
    <CheckoutShell passo={3}>
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-sans text-4xl font-semibold text-marrom sm:text-5xl">
          Pedido Realizado com Sucesso
        </h1>
        <p className="mx-auto mt-5 max-w-xl font-sans text-[17px] leading-relaxed text-marrom">
          Obrigado por escolher a Regadoces. Estamos preparando seu pedido com
          muito carinho e atenção aos detalhes.
        </p>

        {pedido ? (
          <>
            <div className="mx-auto mt-10 max-w-xl rounded-[22px] border border-vinho/60 bg-branco-quente px-7 py-7 text-left">
              <h2 className="font-sans text-2xl font-semibold text-marrom">
                Detalhes de Entrega
              </h2>
              <div className="mt-4 flex flex-col gap-3 font-sans text-[15px] leading-relaxed text-marrom">
                {pedido.entrega.tipo === "entrega" ? (
                  <p>
                    <b>Endereço:</b> {pedido.entrega.endereco}, {pedido.entrega.numero}
                    {pedido.entrega.complemento ? ` - ${pedido.entrega.complemento}` : ""},{" "}
                    {pedido.entrega.bairro}, {pedido.entrega.cidade},{" "}
                    {pedido.entrega.estado} - {pedido.entrega.cep}
                  </p>
                ) : (
                  <p>
                    <b>Retirada no local:</b> busque seu pedido em nosso
                    endereço no Batel sem custo.
                  </p>
                )}
                <p>
                  <b>Pagamento:</b>{" "}
                  {pedido.pagamento.metodo === "pix"
                    ? "Pix"
                    : pedido.pagamento.tipoCartao === "debito"
                      ? "Cartão de débito"
                      : "Cartão de crédito"}{" "}
                  ({pedido.pagamento.status === "aprovado"
                    ? "pago"
                    : pedido.pagamento.status === "pendente"
                      ? "aguardando pagamento"
                      : "não concluído"})
                </p>
                <p>
                  <b>Previsão de entrega:</b> Preparando produto, em breve
                  estará sendo entregue.
                </p>
                <p className="text-marrom/60">
                  <b>Número do pedido:</b> {pedido.id}
                </p>
              </div>
            </div>

            {pedido.pagamento.metodo === "pix" && copiaECola && (
              <PixPagamento
                pedidoId={pedido.id}
                copiaECola={copiaECola}
                qrDataUrl={qrDataUrl}
                statusInicial={pedido.pagamento.status}
                expiraEm={pedido.pagamento.expiraEm ?? null}
              />
            )}
            {pedido.pagamento.metodo === "cartao" && (
              <CartaoPagamento
                pedidoId={pedido.id}
                tipoCartao={pedido.pagamento.tipoCartao ?? "credito"}
                linkPagamento={pedido.pagamento.linkPagamento ?? null}
                statusInicial={pedido.pagamento.status}
                cartaoBandeira={pedido.pagamento.cartaoBandeira ?? null}
                cartaoFinal={pedido.pagamento.cartaoFinal ?? null}
              />
            )}

            <div className="mx-auto mt-6 max-w-xl rounded-[22px] border border-vinho/60 bg-branco-quente px-7 py-6 text-left">
              <h3 className="font-sans text-xl font-semibold text-marrom">
                Resumo do Pedido
              </h3>
              <div className="mt-3 flex flex-col gap-2">
                {pedido.itens.map((i) => (
                  <div key={i.produtoId} className="flex justify-between font-sans text-[15px] text-marrom">
                    <span>
                      {i.quantidade}x {i.nome}
                    </span>
                    <span className="font-semibold">
                      R$ {(i.preco * i.quantidade).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t border-marrom/20 pt-2 font-sans text-[15px] text-marrom">
                  <span>Frete</span>
                  <span>R$ {pedido.frete.toFixed(2).replace(".", ",")}</span>
                </div>
                {pedido.desconto > 0 && (
                  <div className="flex justify-between font-sans text-[15px] text-vinho">
                    <span>Desconto</span>
                    <span>- R$ {pedido.desconto.toFixed(2).replace(".", ",")}</span>
                  </div>
                )}
                <div className="flex justify-between font-sans text-lg font-bold text-marrom">
                  <span>Total</span>
                  <span>R$ {pedido.total.toFixed(2).replace(".", ",")}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-8 font-sans text-[15px] text-marrom/70">
            Pedido não encontrado — mas se você chegou até aqui pelo checkout,
            seu pedido foi registrado com sucesso.
          </p>
        )}

        <p className="mt-10 font-sans text-[17px] text-marrom">
          Quero acompanhar ou tirar alguma dúvida sobre os pedidos?
        </p>
        {pedido ? (
          <WhatsAppPedidoButton
            pedidoId={pedido.id}
            statusInicial={pedido.pagamento.status}
            metodo={pedido.pagamento.metodo}
            corpo={zapCorpo}
            rodape={zapRodape}
          />
        ) : (
          <a
            href="https://wa.me/5541985222525?text=Ol%C3%A1!%20Quero%20acompanhar%20meu%20pedido%20Regadoces."
            target="_blank"
            rel="noopener noreferrer"
            className="relative mt-4 inline-block min-w-[320px]"
          >
            <span className="ticket ticket-face relative block px-10 py-3 font-sans text-[14px] font-bold tracking-wide text-marrom transition-[filter] hover:brightness-95">
              FALE COM A REGADOCES NO WHATSAPP
            </span>
          </a>
        )}

        <div className="mt-8">
          <Link href="/" className="font-sans text-[14px] font-semibold text-marrom hover:underline">
            ← VOLTAR PARA A LOJA
          </Link>
        </div>
      </div>
    </CheckoutShell>
  );
}
