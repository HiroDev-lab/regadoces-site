import { NextResponse } from "next/server";
import { z } from "zod";
import { readCollection, type Coupon } from "@/lib/db";
import { validarCupom } from "@/lib/coupons";

const schema = z.object({
  codigo: z.string().min(2).max(30),
  subtotal: z.number().nonnegative(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const { codigo, subtotal } = parsed.data;
  const cupons = await readCollection<Coupon>("coupons");
  const cupom = cupons.find(
    (c) => c.codigo.toUpperCase() === codigo.toUpperCase()
  );
  const r = validarCupom(cupom, subtotal);
  if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: 404 });
  return NextResponse.json({ desconto: r.desconto });
}
