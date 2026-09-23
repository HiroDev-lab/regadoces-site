import { NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/adminApi";
import { getGoogleInfo, setGoogleInfo } from "@/lib/db";

/*
  Dados do perfil da Regadoces no Google (mostrados na seção
  "Avaliações do Google"): link para avaliar, nota média e total.
  O Ricardo copia do Google Business e cola no painel.
*/

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json(await getGoogleInfo());
}

export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = z
    .object({
      link: z.string().trim().max(500).refine(
        (v) => v === "" || v.startsWith("https://"),
        "O link precisa começar com https://"
      ),
      nota: z.number().min(1).max(5),
      total: z.number().int().min(0).max(1000000),
    })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  await setGoogleInfo(parsed.data);
  return NextResponse.json(parsed.data);
}
