import { NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/adminApi";
import {
  newId,
  readCollection,
  writeCollection,
  type Product,
} from "@/lib/db";

const productSchema = z.object({
  codigo: z.string().trim().max(20),
  nome: z.string().trim().min(2).max(120),
  descricao: z.string().trim().max(600),
  detalhe: z.string().trim().max(80),
  preco: z.number().nonnegative().max(100000),
  // promoção: null/0 = sem promoção; só vale se menor que o preço normal
  precoPromocional: z.number().nonnegative().max(100000).nullable().optional().default(null),
  categoria: z.string().trim().max(40),
  imagem: z.string().trim().max(300),
  ordem: z.number().int().min(0).max(9999),
  estoque: z.number().int().min(0).max(99999),
  ativo: z.boolean(),
});

/** Lista TODOS os produtos (inclusive sem estoque/inativos — visão do admin). */
export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const rows = await readCollection<Product>("products");
  return NextResponse.json(rows.sort((a, b) => a.ordem - b.ordem));
}

/** Cria produto novo. */
export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const rows = await readCollection<Product>("products");
  const novo: Product = { id: newId("p"), ...parsed.data };
  rows.push(novo);
  await writeCollection("products", rows);
  return NextResponse.json(novo, { status: 201 });
}

/** Atualiza produto existente ({ id, ...campos }). */
export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = productSchema.extend({ id: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const rows = await readCollection<Product>("products");
  const idx = rows.findIndex((p) => p.id === parsed.data.id);
  if (idx === -1) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }
  rows[idx] = { ...rows[idx], ...parsed.data };
  await writeCollection("products", rows);
  return NextResponse.json(rows[idx]);
}

/**
 * Reordena os produtos (arrastar e soltar do painel): recebe { ids: [...] }
 * na ordem desejada e renumera todo mundo (1, 2, 3…) numa escrita só.
 * Produtos que porventura não vierem na lista ficam no fim, na ordem antiga.
 */
export async function PATCH(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = z
    .object({ ids: z.array(z.string().min(1)).min(1).max(2000) })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const pos = new Map(parsed.data.ids.map((id, i) => [id, i]));
  const rows = await readCollection<Product>("products");
  const dentro = rows
    .filter((r) => pos.has(r.id))
    .sort((a, b) => pos.get(a.id)! - pos.get(b.id)!);
  const fora = rows
    .filter((r) => !pos.has(r.id))
    .sort((a, b) => a.ordem - b.ordem);
  [...dentro, ...fora].forEach((r, i) => {
    r.ordem = i + 1;
  });
  await writeCollection("products", rows);
  return NextResponse.json({ ok: true });
}

/** Remove produto (?id=). */
export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "id obrigatório." }, { status: 400 });
  const rows = await readCollection<Product>("products");
  const restantes = rows.filter((p) => p.id !== id);
  if (restantes.length === rows.length) {
    return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  }
  await writeCollection("products", restantes);
  return NextResponse.json({ ok: true });
}
