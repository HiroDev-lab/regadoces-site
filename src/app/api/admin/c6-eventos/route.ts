import { NextResponse } from "next/server";
import { guard } from "@/lib/adminApi";
import { readCollection } from "@/lib/db";
import type { CheckoutEvent } from "@/app/api/webhooks/c6/route";

/*
  Lista (somente para o admin logado no painel) as notificações de CHECKOUT
  que o C6 Bank enviou ao webhook /api/webhooks/c6 — evidência da homologação
  da API de Checkout. Filtro opcional: ?id=<id do checkout>.
*/
export async function GET(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  let eventos = await readCollection<CheckoutEvent>("c6_checkout_events");
  if (id) eventos = eventos.filter((e) => e.externalId === id);
  return NextResponse.json(eventos);
}
