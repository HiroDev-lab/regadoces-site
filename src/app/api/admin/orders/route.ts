import { NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/adminApi";
import { readCollection, writeCollection, type Order } from "@/lib/db";

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const rows = await readCollection<Order>("orders");
  return NextResponse.json(
    rows.sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1))
  );
}

/** Atualiza status do pedido: { id, status } */
export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = z
    .object({
      id: z.string().min(1),
      status: z.enum(["recebido", "preparando", "entregue", "cancelado"]),
    })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const rows = await readCollection<Order>("orders");
  const idx = rows.findIndex((o) => o.id === parsed.data.id);
  if (idx === -1) {
    return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  }
  rows[idx].status = parsed.data.status;
  await writeCollection("orders", rows);
  return NextResponse.json(rows[idx]);
}
