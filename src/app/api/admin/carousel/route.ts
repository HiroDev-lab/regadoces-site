import { NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/adminApi";
import { newId, readCollection, writeCollection, type Slide } from "@/lib/db";

const slideSchema = z.object({
  imagem: z.string().trim().min(1).max(300),
  titulo: z.string().trim().max(80),
  frase: z.string().trim().max(160),
  subtitulo: z.string().trim().max(160),
  textoBotao: z.string().trim().max(60),
  linkBotao: z.string().trim().max(200),
  overlay: z.enum(["vinho", "marrom", "nenhum"]).default("vinho"),
  ordem: z.number().int().min(0).max(999),
  ativo: z.boolean(),
});

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const rows = await readCollection<Slide>("carousel");
  return NextResponse.json(rows.sort((a, b) => a.ordem - b.ordem));
}

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = slideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const rows = await readCollection<Slide>("carousel");
  const novo: Slide = { id: newId("s"), ...parsed.data };
  rows.push(novo);
  await writeCollection("carousel", rows);
  return NextResponse.json(novo, { status: 201 });
}

export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = slideSchema.extend({ id: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const rows = await readCollection<Slide>("carousel");
  const idx = rows.findIndex((s) => s.id === parsed.data.id);
  if (idx === -1) {
    return NextResponse.json({ erro: "Slide não encontrado." }, { status: 404 });
  }
  rows[idx] = { ...rows[idx], ...parsed.data };
  await writeCollection("carousel", rows);
  return NextResponse.json(rows[idx]);
}

export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "id obrigatório." }, { status: 400 });
  const rows = await readCollection<Slide>("carousel");
  const restantes = rows.filter((s) => s.id !== id);
  if (restantes.length === rows.length) {
    return NextResponse.json({ erro: "Slide não encontrado." }, { status: 404 });
  }
  await writeCollection("carousel", restantes);
  return NextResponse.json({ ok: true });
}
