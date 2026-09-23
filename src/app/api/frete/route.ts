import { NextResponse } from "next/server";
import { z } from "zod";
import { calcularFrete } from "@/lib/frete";

/*
  Cotação de frete por CEP — tabela por distância do motoboy
  (origem: Rua Doutor Generoso Borges, 317 — Batel). Regra em
  src/lib/frete.ts; o checkout recalcula com a mesma regra.
*/
const schema = z.object({ cep: z.string().regex(/^\d{8}$/) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "CEP inválido." }, { status: 400 });
  }
  const frete = await calcularFrete(parsed.data.cep);
  if (!frete.ok) {
    return NextResponse.json({ erro: frete.erro }, { status: 422 });
  }
  return NextResponse.json({
    valor: frete.valor,
    km: frete.km,
    minutos: frete.minutos,
    prazo: `aprox. ${frete.minutos} min (${frete.km} km)`,
  });
}
