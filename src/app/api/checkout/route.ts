import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getLojaStatus,
  newId,
  readCollection,
  writeCollection,
  type Coupon,
  type Order,
  type Product,
} from "@/lib/db";
import { validarCupom } from "@/lib/coupons";
import { calcularFrete } from "@/lib/frete";
import { notificarNovoPedido } from "@/lib/notificar";
import { precoAtual } from "@/lib/preco";
import {
  CHECKOUT_VALOR_MINIMO_CENTAVOS,
  cartaoDisponivel,
  createCheckoutLink,
  createPixCharge,
} from "@/lib/c6bank";

/*
  Criação do pedido.
  SEGURANÇA:
  - Preço e estoque são SEMPRE recalculados aqui a partir do banco —
    o carrinho do navegador nunca é fonte de verdade.
  - Cartão: o site NÃO recebe dados de cartão — cria um link de pagamento
    no C6 (API de Checkout) e o cliente digita o cartão na página do banco.
  - Estoque é debitado na confirmação do pedido.
*/

const schema = z.object({
  itens: z
    .array(
      z.object({
        produtoId: z.string().min(1),
        quantidade: z.number().int().min(1).max(99),
      })
    )
    .min(1)
    .max(30),
  identificacao: z.object({
    nome: z.string().trim().min(2).max(60),
    sobrenome: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(120),
    cpf: z.string().trim().min(11).max(14),
    telefone: z.string().trim().min(8).max(16),
    tipo: z.enum(["entrega", "retirada"]),
    cep: z.string().trim().max(9).optional().default(""),
    endereco: z.string().trim().max(120).optional().default(""),
    numero: z.string().trim().max(10).optional().default(""),
    complemento: z.string().trim().max(60).optional().default(""),
    bairro: z.string().trim().max(60).optional().default(""),
    cidade: z.string().trim().max(60).optional().default(""),
    estado: z.string().trim().max(2).optional().default(""),
  }),
  cupom: z.string().trim().max(30).nullable(),
  cep: z.string().trim().max(9).optional().default(""),
  metodo: z.enum(["cartao", "pix"]),
  // cartão = crédito ou débito; o cartão em si é digitado na página segura do C6
  tipoCartao: z.enum(["credito", "debito"]).optional().default("credito"),
});

export async function POST(req: Request) {
  // loja fechada = checkout bloqueado (o carrinho continua funcionando)
  const loja = await getLojaStatus();
  if (!loja.aberta) {
    return NextResponse.json(
      {
        erro: loja.voltaAs
          ? `A loja está fechada no momento — voltamos às ${loja.voltaAs}. Seu carrinho fica salvo para você finalizar quando a loja reabrir.`
          : "A loja está fechada no momento. Seu carrinho fica salvo para você finalizar quando a loja reabrir.",
      },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados do pedido inválidos. Revise as etapas." },
      { status: 400 }
    );
  }
  const { itens, identificacao, cupom, metodo, tipoCartao } = parsed.data;

  if (identificacao.tipo === "entrega") {
    const e = identificacao;
    if (!e.cep || !e.endereco || !e.numero || !e.bairro || !e.cidade || !e.estado) {
      return NextResponse.json(
        { erro: "Endereço de entrega incompleto." },
        { status: 400 }
      );
    }
  }
  // ---- recalcula tudo no servidor ----
  const produtos = await readCollection<Product>("products");
  const itensPedido = [];
  for (const item of itens) {
    const p = produtos.find((x) => x.id === item.produtoId);
    if (!p || !p.ativo) {
      return NextResponse.json(
        { erro: "Um dos produtos não está mais disponível." },
        { status: 409 }
      );
    }
    if (p.estoque < item.quantidade) {
      return NextResponse.json(
        { erro: `Estoque insuficiente para "${p.nome}".` },
        { status: 409 }
      );
    }
    itensPedido.push({
      produtoId: p.id,
      nome: p.nome,
      // cobra o preço promocional quando houver
      preco: precoAtual(p),
      quantidade: item.quantidade,
    });
  }

  const subtotal = itensPedido.reduce((s, i) => s + i.preco * i.quantidade, 0);

  // frete real pela tabela de distância (retirada = grátis)
  let frete = 0;
  if (identificacao.tipo === "entrega") {
    const f = await calcularFrete(identificacao.cep);
    if (!f.ok) {
      return NextResponse.json({ erro: f.erro }, { status: 400 });
    }
    frete = f.valor;
  }

  let desconto = 0;
  let cupomAplicado: Coupon | undefined;
  if (cupom) {
    const cupons = await readCollection<Coupon>("coupons");
    cupomAplicado = cupons.find(
      (c) => c.codigo.toUpperCase() === cupom.toUpperCase()
    );
    const r = validarCupom(cupomAplicado, subtotal);
    if (!r.ok) {
      return NextResponse.json({ erro: r.erro }, { status: 400 });
    }
    // cupom "1 uso por CPF" (pedido do Ricardo): o mesmo CPF não pode
    // usar o cupom de novo em outro pedido. Não contam: pedidos cancelados,
    // pagamento recusado e Pix/link de cartão que venceu sem ser pago
    // (senão quem desistiu do Pix nunca mais conseguiria usar o cupom).
    if (cupomAplicado?.umPorCpf) {
      const soDigitos = (s: string) => s.replace(/\D/g, "");
      const cpfCliente = soDigitos(identificacao.cpf);
      const agora = Date.now();
      const contaComoUso = (o: Order) => {
        if (o.status === "cancelado") return false;
        if (o.pagamento.status === "recusado") return false;
        if (
          o.pagamento.status === "pendente" &&
          o.pagamento.expiraEm &&
          new Date(o.pagamento.expiraEm).getTime() < agora
        )
          return false;
        return true;
      };
      const pedidosAnteriores = await readCollection<Order>("orders");
      const jaUsou = pedidosAnteriores.some(
        (o) =>
          contaComoUso(o) &&
          o.cupom?.toUpperCase() === cupomAplicado!.codigo.toUpperCase() &&
          soDigitos(o.cliente.cpf) === cpfCliente
      );
      if (jaUsou) {
        return NextResponse.json(
          { erro: "Este cupom já foi utilizado neste CPF (limite de 1 uso por pessoa)." },
          { status: 400 }
        );
      }
    }
    desconto = r.desconto;
  }

  const total = Math.max(0, subtotal + frete - desconto);
  const pedidoId = newId("ped-");

  // ---- pagamento (C6 Bank; simulado quando as credenciais não estão configuradas) ----
  let pagamento: Order["pagamento"];
  if (metodo === "pix") {
    let pix;
    try {
      pix = await createPixCharge(Math.round(total * 100), pedidoId, {
        nome: `${identificacao.nome} ${identificacao.sobrenome}`.trim(),
        cpf: identificacao.cpf,
      });
    } catch (e) {
      console.error("checkout: falha ao gerar Pix", e);
      return NextResponse.json(
        { erro: "Não conseguimos gerar o Pix agora. Tente novamente em instantes." },
        { status: 502 }
      );
    }
    pagamento = {
      metodo: "pix",
      status: pix.status === "aprovado" ? "aprovado" : "pendente",
      referencia: pix.referencia,
      txid: pix.txid,
      copiaECola: pix.copiaECola,
      expiraEm: pix.expiraEm,
    };
  } else {
    // ---- cartão (crédito/débito) = link de pagamento da API de Checkout do C6 ----
    if (!cartaoDisponivel()) {
      return NextResponse.json(
        { erro: "Pagamento com cartão em breve — por enquanto, escolha Pix." },
        { status: 400 }
      );
    }
    const totalCentavos = Math.round(total * 100);
    if (totalCentavos < CHECKOUT_VALOR_MINIMO_CENTAVOS) {
      return NextResponse.json(
        { erro: "Pagamento com cartão só a partir de R$ 5,00. Para este valor, escolha Pix." },
        { status: 400 }
      );
    }
    // URL pública do site para o C6 devolver o cliente (atrás do Passenger o
    // req.url vem como 127.0.0.1, por isso usa o host do navegador)
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "regadoces.com.br";
    const local = /^(localhost|127\.)/.test(host);
    const siteUrl =
      (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "") || `${local ? "http" : "https"}://${host}`;
    let link;
    try {
      link = await createCheckoutLink({
        valorCentavos: totalCentavos,
        pedidoId,
        tipo: tipoCartao,
        descricao: `Regadoces - pedido ${pedidoId}`,
        redirectUrl: `${siteUrl}/pedido/${pedidoId}`,
        pagador: {
          nome: `${identificacao.nome} ${identificacao.sobrenome}`.trim(),
          cpf: identificacao.cpf,
          email: identificacao.email,
          telefone: identificacao.telefone,
        },
      });
    } catch (e) {
      console.error("checkout: falha ao gerar link de cartão no C6", e);
      return NextResponse.json(
        { erro: "Não conseguimos iniciar o pagamento com cartão agora. Tente novamente ou escolha Pix." },
        { status: 502 }
      );
    }
    pagamento = {
      metodo: "cartao",
      status: link.status,
      referencia: link.referencia,
      tipoCartao,
      checkoutId: link.checkoutId,
      linkPagamento: link.url,
      expiraEm: link.expiraEm,
    };
  }

  // ---- debita estoque e registra o pedido ----
  for (const item of itensPedido) {
    const p = produtos.find((x) => x.id === item.produtoId)!;
    p.estoque -= item.quantidade;
  }
  await writeCollection("products", produtos);

  if (cupomAplicado) {
    const cupons = await readCollection<Coupon>("coupons");
    const c = cupons.find((x) => x.id === cupomAplicado.id);
    if (c) {
      c.usos += 1;
      await writeCollection("coupons", cupons);
    }
  }

  const orders = await readCollection<Order>("orders");
  const pedido: Order = {
    id: pedidoId,
    itens: itensPedido,
    subtotal,
    frete,
    desconto,
    total,
    cupom: cupomAplicado?.codigo ?? null,
    cliente: {
      nome: identificacao.nome,
      sobrenome: identificacao.sobrenome,
      email: identificacao.email,
      cpf: identificacao.cpf,
      telefone: identificacao.telefone,
    },
    entrega: {
      tipo: identificacao.tipo,
      cep: identificacao.cep,
      endereco: identificacao.endereco,
      numero: identificacao.numero,
      complemento: identificacao.complemento,
      bairro: identificacao.bairro,
      cidade: identificacao.cidade,
      estado: identificacao.estado,
    },
    pagamento,
    status: "recebido",
    criadoEm: new Date().toISOString(),
  };
  orders.push(pedido);
  await writeCollection("orders", orders);
  await notificarNovoPedido(pedido); // push no celular do Ricardo (ntfy)

  // cartão: o navegador manda o cliente para a página de pagamento do C6
  // (ou, no modo simulado, direto para a página do pedido)
  return NextResponse.json({
    pedidoId,
    ...(pagamento.metodo === "cartao" && pagamento.status === "pendente" && pagamento.linkPagamento
      ? { pagamentoUrl: pagamento.linkPagamento }
      : {}),
  });
}
