import { NextResponse } from "next/server";
import { z } from "zod";
import {
  newId,
  readCollection,
  writeCollection,
  type Testimonial,
} from "@/lib/db";

/*
  Depoimentos enviados pelo site entram como "aprovado: false" e só
  aparecem na Home depois que o administrador aprovar no painel.
*/
const schema = z.object({
  nome: z.string().trim().min(2).max(60),
  sobrenome: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(120),
  telefone: z.string().trim().max(20).optional().default(""),
  texto: z.string().trim().min(5).max(600),
});

// rate-limit simples em memória: máx. 5 envios por IP a cada 10 min
const hits = new Map<string, number[]>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const agora = Date.now();
  const janela = (hits.get(ip) ?? []).filter((t) => agora - t < 10 * 60_000);
  if (janela.length >= 5) {
    return NextResponse.json(
      { erro: "Muitos envios. Tente novamente em alguns minutos." },
      { status: 429 }
    );
  }
  janela.push(agora);
  hits.set(ip, janela);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Preencha os campos corretamente." },
      { status: 400 }
    );
  }

  const rows = await readCollection<Testimonial>("testimonials");
  rows.push({
    id: newId("t"),
    ...parsed.data,
    telefone: parsed.data.telefone ?? "",
    aprovado: false,
    criadoEm: new Date().toISOString(),
  });
  await writeCollection("testimonials", rows);
  return NextResponse.json({ ok: true });
}
