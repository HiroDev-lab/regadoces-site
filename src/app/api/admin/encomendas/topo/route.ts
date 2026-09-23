import { NextResponse } from "next/server";
import { z } from "zod";
import { guard, mensagemZod } from "@/lib/adminApi";
import { getEncomendasTopo, setEncomendasTopo } from "@/lib/db";

/* Foto grande, título e texto do topo da página /encomendas. */

const ROTULOS = { foto: "Foto grande", titulo: "Título", texto: "Texto" };

const schema = z.object({
  foto: z.string().trim().min(1).max(500),
  titulo: z.string().trim().min(1).max(300),
  texto: z.string().trim().min(1).max(2000),
});

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json(await getEncomendasTopo());
}

export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: mensagemZod(parsed.error, ROTULOS) }, { status: 400 });
  }
  const topo = { id: "topo", ...parsed.data };
  await setEncomendasTopo(topo);
  return NextResponse.json(topo);
}
