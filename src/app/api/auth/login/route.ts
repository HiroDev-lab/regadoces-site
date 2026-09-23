import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, verifyCredentials } from "@/lib/auth";

const schema = z.object({
  email: z.string().email().max(120),
  senha: z.string().min(6).max(100),
});

// rate-limit de login: máx. 8 tentativas por IP a cada 15 min
const tentativas = new Map<string, number[]>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const agora = Date.now();
  const janela = (tentativas.get(ip) ?? []).filter((t) => agora - t < 15 * 60_000);
  if (janela.length >= 8) {
    return NextResponse.json(
      { erro: "Muitas tentativas. Aguarde 15 minutos." },
      { status: 429 }
    );
  }
  janela.push(agora);
  tentativas.set(ip, janela);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const admin = await verifyCredentials(parsed.data.email, parsed.data.senha);
  if (!admin) {
    return NextResponse.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }

  await createSession(admin);
  return NextResponse.json({ ok: true });
}
