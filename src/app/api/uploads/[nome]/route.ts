import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

/*
  Serve as fotos enviadas pelo painel (pasta /uploads na raiz do app).
  Só aceita nomes gerados pelo upload (hex + extensão) — sem path traversal.
*/
const TIPOS: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ nome: string }> }
) {
  const { nome } = await params;
  if (!/^[a-f0-9]{24}\.(jpg|png|webp)$/.test(nome)) {
    return new NextResponse("Não encontrado", { status: 404 });
  }
  try {
    const arquivo = await fs.readFile(path.join(process.cwd(), "uploads", nome));
    return new NextResponse(new Uint8Array(arquivo), {
      headers: {
        "Content-Type": TIPOS[path.extname(nome)] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Não encontrado", { status: 404 });
  }
}
