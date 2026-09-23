import { NextResponse } from "next/server";
import { z } from "zod";
import { guard, mensagemZod } from "@/lib/adminApi";
import { seedEncomendas, updateEncomenda } from "@/lib/db";

/*
  Itens de "O que você pode encomendar?" (página /encomendas), editáveis
  no painel: foto do card, textos e a galeria de fotos com legenda
  (número livre de fotos — pedido do Ricardo).
*/

const fotoSchema = z.object({
  url: z.string().trim().min(1).max(500),
  legenda: z.string().trim().max(200).default(""),
  recorteCard: z.boolean().optional(),
});

const schema = z.object({
  id: z.string().trim().min(1).max(60),
  nome: z.string().trim().min(1).max(80),
  desc: z.string().trim().min(1).max(200),
  cardFoto: z.string().trim().min(1).max(500),
  resumo: z.string().trim().max(1000).default(""),
  fotos: z.array(fotoSchema).max(60).default([]),
  detalhes: z.array(z.string().trim().min(1).max(1000)).max(60).default([]),
});

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json(await seedEncomendas());
}

export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: mensagemZod(parsed.error, { nome: "Nome", desc: "Frase do card", cardFoto: "Foto do card", resumo: "Frase de abertura", fotos: "Fotos da página", detalhes: "Como funciona" }) }, { status: 400 });
  }
  const atuais = await seedEncomendas();
  const atual = atuais.find((e) => e.id === parsed.data.id);
  if (!atual) {
    return NextResponse.json({ erro: "Item não encontrado." }, { status: 404 });
  }
  // ordem, whatsapp e link de cardápio não são editáveis pela tela
  const novo = { ...atual, ...parsed.data };
  await updateEncomenda(novo);
  return NextResponse.json(novo);
}
