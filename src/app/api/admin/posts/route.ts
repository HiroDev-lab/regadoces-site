import { NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/adminApi";
import { newId, readCollection, writeCollection, type Post } from "@/lib/db";

function slugify(t: string) {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

const postSchema = z.object({
  titulo: z.string().trim().min(3).max(160),
  capa: z.string().trim().max(300),
  resumo: z.string().trim().max(300),
  conteudo: z.string().trim().min(10).max(20000),
  destaque: z.boolean(),
  ordem: z.number().int().min(0).max(9999),
  ativo: z.boolean(),
});

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const rows = await readCollection<Post>("posts");
  return NextResponse.json(rows.sort((a, b) => a.ordem - b.ordem));
}

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const rows = await readCollection<Post>("posts");
  let slug = slugify(parsed.data.titulo);
  while (rows.some((p) => p.slug === slug)) slug = `${slug}-2`;
  const novo: Post = {
    id: newId("b"),
    slug,
    ...parsed.data,
    criadoEm: new Date().toISOString(),
  };
  // só pode existir um destaque
  if (novo.destaque) rows.forEach((p) => (p.destaque = false));
  rows.push(novo);
  await writeCollection("posts", rows);
  return NextResponse.json(novo, { status: 201 });
}

export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = postSchema.extend({ id: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const rows = await readCollection<Post>("posts");
  const idx = rows.findIndex((p) => p.id === parsed.data.id);
  if (idx === -1) {
    return NextResponse.json({ erro: "Matéria não encontrada." }, { status: 404 });
  }
  if (parsed.data.destaque) rows.forEach((p) => (p.destaque = false));
  rows[idx] = { ...rows[idx], ...parsed.data };
  await writeCollection("posts", rows);
  return NextResponse.json(rows[idx]);
}

export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "id obrigatório." }, { status: 400 });
  const rows = await readCollection<Post>("posts");
  const restantes = rows.filter((p) => p.id !== id);
  if (restantes.length === rows.length) {
    return NextResponse.json({ erro: "Matéria não encontrada." }, { status: 404 });
  }
  await writeCollection("posts", restantes);
  return NextResponse.json({ ok: true });
}
