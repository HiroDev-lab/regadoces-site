import { NextResponse } from "next/server";
import { z } from "zod";
import { guard, mensagemZod } from "@/lib/adminApi";
import { newId, readCollection, seedFaq, writeCollection, type FaqItem } from "@/lib/db";

/* FAQ da Home (perguntas e respostas), editável no painel. */

const ROTULOS = { pergunta: "Pergunta", resposta: "Resposta", ordem: "Ordem" };

const faqSchema = z.object({
  pergunta: z.string().trim().min(1).max(300),
  resposta: z.string().trim().min(1).max(2000),
  ordem: z.number().int().min(0).max(999),
  ativo: z.boolean(),
});

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json(await seedFaq());
}

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = faqSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: mensagemZod(parsed.error, ROTULOS) }, { status: 400 });
  }
  const rows = await seedFaq();
  // pergunta nova sempre entra no fim (o painel reordena pelas setas)
  const ultima = rows.reduce((m, f) => Math.max(m, f.ordem), 0);
  const novo: FaqItem = { id: newId("f"), ...parsed.data, ordem: ultima + 1 };
  await writeCollection("faq", [...rows, novo]);
  return NextResponse.json(novo, { status: 201 });
}

export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = faqSchema.extend({ id: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: mensagemZod(parsed.error, ROTULOS) }, { status: 400 });
  }
  const rows = await seedFaq();
  const idx = rows.findIndex((f) => f.id === parsed.data.id);
  if (idx === -1) {
    return NextResponse.json({ erro: "Pergunta não encontrada." }, { status: 404 });
  }
  rows[idx] = { ...rows[idx], ...parsed.data };
  await writeCollection("faq", rows);
  return NextResponse.json(rows[idx]);
}

/** Reordena tudo de uma vez: body = { ids: [...] } na ordem desejada. */
export async function PATCH(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = z.object({ ids: z.array(z.string().min(1)).min(1).max(200) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const rows = await seedFaq();
  const pos = new Map(parsed.data.ids.map((id, i) => [id, i + 1]));
  const novas = rows.map((f) => ({ ...f, ordem: pos.get(f.id) ?? f.ordem }));
  await writeCollection("faq", novas);
  return NextResponse.json(novas.sort((a, b) => a.ordem - b.ordem));
}

export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "id obrigatório." }, { status: 400 });
  const rows = await readCollection<FaqItem>("faq");
  const restantes = rows.filter((f) => f.id !== id);
  if (restantes.length === rows.length) {
    return NextResponse.json({ erro: "Pergunta não encontrada." }, { status: 404 });
  }
  await writeCollection("faq", restantes);
  return NextResponse.json({ ok: true });
}
