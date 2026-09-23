import { NextResponse } from "next/server";
import { registrarVisita } from "@/lib/visitas";

/*
  Beacon de visita — o MetricaBeacon (layout do site) manda 1 POST por
  página vista. Não conta o painel nem robôs óbvios.
*/

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (/bot|crawler|spider|preview|facebookexternalhit|whatsapp/i.test(ua)) {
      return NextResponse.json({ ok: true });
    }
    const body = await req.json().catch(() => null);
    const path = typeof body?.path === "string" ? body.path.slice(0, 200) : "/";
    if (path.startsWith("/painel") || path.startsWith("/api")) {
      return NextResponse.json({ ok: true });
    }
    const ip =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "";
    await registrarVisita(path, ip);
  } catch (e) {
    console.error("metrica:", e);
  }
  return NextResponse.json({ ok: true });
}
