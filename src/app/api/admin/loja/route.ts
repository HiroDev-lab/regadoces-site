import { NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/adminApi";
import { getLojaStatus, setLojaStatus } from "@/lib/db";

const schema = z.object({
  aberta: z.boolean(),
  // "17:00" ou vazio (fechada sem horário de volta)
  voltaAs: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .or(z.literal("")),
});

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json(await getLojaStatus());
}

export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  // horário de volta só faz sentido com a loja fechada
  const status = {
    aberta: parsed.data.aberta,
    voltaAs: parsed.data.aberta ? "" : parsed.data.voltaAs,
  };
  await setLojaStatus(status);
  return NextResponse.json(status);
}
