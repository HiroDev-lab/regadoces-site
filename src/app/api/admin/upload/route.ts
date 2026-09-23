import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { guard } from "@/lib/adminApi";
import { supabaseConfigured, supabaseServer, UPLOADS_BUCKET } from "@/lib/supabase";

/*
  Upload de imagens (foto de produto, capa de matéria, slide da home).
  - Aceita apenas jpg/png/webp até 5MB.
  - Salva em /public/uploads com nome aleatório (evita path traversal).
  Na hospedagem (Supabase ligado) a foto vai para o bucket público
  "uploads" do Supabase Storage — em serverless o disco não persiste.
*/

const TIPOS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;

  const form = await req.formData().catch(() => null);
  const file = form?.get("arquivo");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ erro: "Arquivo ausente." }, { status: 400 });
  }
  const ext = TIPOS[file.type];
  if (!ext) {
    return NextResponse.json(
      { erro: "Formato não suportado (use JPG, PNG ou WebP)." },
      { status: 415 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { erro: "Imagem muito grande (máx. 5MB)." },
      { status: 413 }
    );
  }

  const nome = crypto.randomBytes(12).toString("hex") + ext;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (supabaseConfigured()) {
    const sb = supabaseServer();
    const { error } = await sb.storage
      .from(UPLOADS_BUCKET)
      .upload(nome, bytes, { contentType: file.type, upsert: false });
    if (error) {
      return NextResponse.json({ erro: `Falha ao enviar a foto: ${error.message}` }, { status: 500 });
    }
    const { data } = sb.storage.from(UPLOADS_BUCKET).getPublicUrl(nome);
    return NextResponse.json({ url: data.publicUrl }, { status: 201 });
  }

  const destino = path.join(process.cwd(), "uploads", nome);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, bytes);

  return NextResponse.json({ url: `/fotos/${nome}` }, { status: 201 });
}
