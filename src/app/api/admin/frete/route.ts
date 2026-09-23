import { NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/adminApi";
import { FRETE_PADRAO, getFreteTabela, setFreteTabela } from "@/lib/db";

const schema = z.object({
  faixas: z
    .array(
      z.object({
        ateKm: z.number().positive().max(200),
        valor: z.number().min(0).max(1000),
        minutos: z.number().int().positive().max(600),
      })
    )
    .min(1)
    .max(40),
});

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json({ faixas: await getFreteTabela(), padrao: FRETE_PADRAO });
}

export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const faixas = [...parsed.data.faixas].sort((a, b) => a.ateKm - b.ateKm);
  // duas faixas com o mesmo "até X km" seriam ambíguas
  if (new Set(faixas.map((f) => f.ateKm)).size !== faixas.length) {
    return NextResponse.json(
      { erro: "Há duas faixas com o mesmo limite de km." },
      { status: 400 }
    );
  }
  await setFreteTabela(faixas);
  return NextResponse.json({ faixas });
}
