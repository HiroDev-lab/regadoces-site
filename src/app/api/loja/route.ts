import { NextResponse } from "next/server";
import { cartaoDisponivel } from "@/lib/c6bank";
import { getLojaStatus } from "@/lib/db";

/* Status público da loja (aberta/fechada) — usado pelo aviso no site
   e pelo resumo do pedido para travar o checkout. Também diz se o
   pagamento com cartão está ligado (decidido pelo servidor, ver
   cartaoDisponivel em c6bank.ts), para a página de pagamento não
   depender de variável embutida no build. */

export const dynamic = "force-dynamic";

export async function GET() {
  const loja = await getLojaStatus();
  return NextResponse.json({ ...loja, cartao: cartaoDisponivel() });
}
