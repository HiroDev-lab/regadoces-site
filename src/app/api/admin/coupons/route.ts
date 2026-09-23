import { NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/adminApi";
import {
  newId,
  readCollection,
  writeCollection,
  type Coupon,
} from "@/lib/db";

const couponSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/, "Use apenas letras, números, - e _"),
  tipo: z.enum(["percentual", "valor"]),
  valor: z.number().positive().max(100000),
  validade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  usoMaximo: z.number().int().min(0).max(1000000),
  umPorCpf: z.boolean().optional().default(false),
  ativo: z.boolean(),
});

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const rows = await readCollection<Coupon>("coupons");
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = couponSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const rows = await readCollection<Coupon>("coupons");
  if (
    rows.some(
      (c) => c.codigo.toUpperCase() === parsed.data.codigo.toUpperCase()
    )
  ) {
    return NextResponse.json({ erro: "Já existe cupom com esse código." }, { status: 409 });
  }
  const novo: Coupon = {
    id: newId("c"),
    ...parsed.data,
    codigo: parsed.data.codigo.toUpperCase(),
    usos: 0,
    criadoEm: new Date().toISOString(),
  };
  rows.push(novo);
  await writeCollection("coupons", rows);
  return NextResponse.json(novo, { status: 201 });
}

export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = couponSchema.extend({ id: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const rows = await readCollection<Coupon>("coupons");
  const idx = rows.findIndex((c) => c.id === parsed.data.id);
  if (idx === -1) {
    return NextResponse.json({ erro: "Cupom não encontrado." }, { status: 404 });
  }
  rows[idx] = {
    ...rows[idx],
    ...parsed.data,
    codigo: parsed.data.codigo.toUpperCase(),
  };
  await writeCollection("coupons", rows);
  return NextResponse.json(rows[idx]);
}

export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "id obrigatório." }, { status: 400 });
  const rows = await readCollection<Coupon>("coupons");
  const restantes = rows.filter((c) => c.id !== id);
  if (restantes.length === rows.length) {
    return NextResponse.json({ erro: "Cupom não encontrado." }, { status: 404 });
  }
  await writeCollection("coupons", restantes);
  return NextResponse.json({ ok: true });
}
