import { NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/adminApi";
import {
  newId,
  readCollection,
  writeCollection,
  type Testimonial,
} from "@/lib/db";

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const rows = await readCollection<Testimonial>("testimonials");
  return NextResponse.json(rows);
}

/** Cria avaliação manualmente (Ricardo copia do Google): {nome, sobrenome, texto, nota} */
export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = z
    .object({
      nome: z.string().trim().min(1).max(60),
      sobrenome: z.string().trim().max(60).default(""),
      texto: z.string().trim().min(1).max(1000),
      nota: z.number().int().min(1).max(5).default(5),
    })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const rows = await readCollection<Testimonial>("testimonials");
  const novo: Testimonial = {
    id: newId("t"),
    ...parsed.data,
    email: "",
    telefone: "",
    aprovado: true,
    criadoEm: new Date().toISOString(),
  };
  rows.push(novo);
  await writeCollection("testimonials", rows);
  return NextResponse.json(novo, { status: 201 });
}

/** Atualiza depoimento: { id, aprovado? , nota? } */
export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = z
    .object({
      id: z.string().min(1),
      aprovado: z.boolean().optional(),
      nota: z.number().int().min(1).max(5).optional(),
    })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const rows = await readCollection<Testimonial>("testimonials");
  const idx = rows.findIndex((t) => t.id === parsed.data.id);
  if (idx === -1) {
    return NextResponse.json({ erro: "Depoimento não encontrado." }, { status: 404 });
  }
  if (parsed.data.aprovado !== undefined) rows[idx].aprovado = parsed.data.aprovado;
  if (parsed.data.nota !== undefined) rows[idx].nota = parsed.data.nota;
  await writeCollection("testimonials", rows);
  return NextResponse.json(rows[idx]);
}

export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "id obrigatório." }, { status: 400 });
  const rows = await readCollection<Testimonial>("testimonials");
  const restantes = rows.filter((t) => t.id !== id);
  if (restantes.length === rows.length) {
    return NextResponse.json({ erro: "Depoimento não encontrado." }, { status: 404 });
  }
  await writeCollection("testimonials", restantes);
  return NextResponse.json({ ok: true });
}
