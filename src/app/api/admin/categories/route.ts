import { NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/adminApi";
import {
  newId,
  readCollection,
  seedCategoriasSePreciso,
  writeCollection,
  type Categoria,
  type Product,
} from "@/lib/db";

const categoriaSchema = z.object({
  nome: z.string().trim().min(2).max(40),
  imagem: z.string().trim().max(300).default(""),
  ativo: z.boolean(),
});

/** Lista as categorias (semeia a lista padrão no primeiro acesso). */
export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json(await seedCategoriasSePreciso());
}

/** Cria categoria nova (vai para o fim da fila). */
export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = categoriaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const rows = await seedCategoriasSePreciso();
  if (rows.some((c) => c.nome.toLowerCase() === parsed.data.nome.toLowerCase())) {
    return NextResponse.json({ erro: "Já existe uma categoria com esse nome." }, { status: 409 });
  }
  const nova: Categoria = {
    id: newId("cat"),
    ...parsed.data,
    ordem: rows.length + 1,
  };
  rows.push(nova);
  await writeCollection("categories", rows);
  return NextResponse.json(nova, { status: 201 });
}

/**
 * Edita categoria ({ id, nome, imagem, ativo }). Se o nome mudar, os
 * produtos daquela categoria são atualizados junto (renomear em cascata).
 */
export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = categoriaSchema.extend({ id: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const rows = await seedCategoriasSePreciso();
  const idx = rows.findIndex((c) => c.id === parsed.data.id);
  if (idx === -1) {
    return NextResponse.json({ erro: "Categoria não encontrada." }, { status: 404 });
  }
  if (
    rows.some(
      (c) =>
        c.id !== parsed.data.id &&
        c.nome.toLowerCase() === parsed.data.nome.toLowerCase()
    )
  ) {
    return NextResponse.json({ erro: "Já existe uma categoria com esse nome." }, { status: 409 });
  }

  const nomeAntigo = rows[idx].nome;
  rows[idx] = { ...rows[idx], ...parsed.data };
  await writeCollection("categories", rows);

  if (nomeAntigo.toLowerCase() !== parsed.data.nome.toLowerCase()) {
    const produtos = await readCollection<Product>("products");
    let mudou = false;
    for (const p of produtos) {
      if (p.categoria.toLowerCase() === nomeAntigo.toLowerCase()) {
        p.categoria = parsed.data.nome;
        mudou = true;
      }
    }
    if (mudou) await writeCollection("products", produtos);
  }
  return NextResponse.json(rows[idx]);
}

/** Reordena ({ ids: [...] } na ordem desejada) — arrastar e soltar. */
export async function PATCH(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = z
    .object({ ids: z.array(z.string().min(1)).min(1).max(500) })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const pos = new Map(parsed.data.ids.map((id, i) => [id, i]));
  const rows = await seedCategoriasSePreciso();
  const dentro = rows
    .filter((c) => pos.has(c.id))
    .sort((a, b) => pos.get(a.id)! - pos.get(b.id)!);
  const fora = rows
    .filter((c) => !pos.has(c.id))
    .sort((a, b) => a.ordem - b.ordem);
  [...dentro, ...fora].forEach((c, i) => {
    c.ordem = i + 1;
  });
  await writeCollection("categories", rows);
  return NextResponse.json({ ok: true });
}

/** Remove categoria (?id=) — só quando nenhum produto a usa. */
export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "id obrigatório." }, { status: 400 });
  const rows = await seedCategoriasSePreciso();
  const alvo = rows.find((c) => c.id === id);
  if (!alvo) {
    return NextResponse.json({ erro: "Categoria não encontrada." }, { status: 404 });
  }
  const produtos = await readCollection<Product>("products");
  const emUso = produtos.filter(
    (p) => p.categoria.toLowerCase() === alvo.nome.toLowerCase()
  ).length;
  if (emUso > 0) {
    return NextResponse.json(
      {
        erro: `Há ${emUso} produto(s) nessa categoria. Mova-os para outra categoria antes de excluir (ou apenas oculte a categoria).`,
      },
      { status: 409 }
    );
  }
  await writeCollection(
    "categories",
    rows.filter((c) => c.id !== id)
  );
  return NextResponse.json({ ok: true });
}
