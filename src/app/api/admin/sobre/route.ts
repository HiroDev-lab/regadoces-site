import { NextResponse } from "next/server";
import { z } from "zod";
import { guard, mensagemZod } from "@/lib/adminApi";
import { getSobre, setSobre } from "@/lib/db";

/* Conteúdo editável da página Sobre nós (textos, tiras de foto, cozinha). */

/*
  Limites folgados de propósito: o Ricardo cola textos grandes. Quando
  algo falha, a mensagem diz QUAL campo (antes era só "Dados inválidos").
*/
const ROTULOS: Record<string, string> = {
  heroParagrafos: "Parágrafos do topo",
  fazemosTitulo: "Título de O que fazemos",
  fazemosTexto: "Texto de O que fazemos",
  fazemosBotao: "Botão de O que fazemos",
  tiras: "Fotos do hover",
  eventosTitulo: "Título de Eventos e festas",
  eventosTexto1: "Frase de destaque de Eventos e festas",
  eventosTexto2: "Texto de Eventos e festas",
  cozinhaFoto: "Foto da cozinha",
  cozinhaTitulo: "Título em cima da foto",
  cozinhaParagrafos: "Parágrafos de Feito por pessoas",
  cozinhaBotao: "Botão de Feito por pessoas",
};

const schema = z.object({
  heroParagrafos: z.array(z.string().trim().min(1).max(3000)).min(1).max(30),
  fazemosTitulo: z.string().trim().min(1).max(300),
  fazemosTexto: z.string().trim().min(1).max(3000),
  fazemosBotao: z.string().trim().min(1).max(80),
  tiras: z.array(z.string().trim().min(1).max(500)).length(4),
  eventosTitulo: z.string().trim().min(1).max(300),
  eventosTexto1: z.string().trim().min(1).max(1000),
  eventosTexto2: z.string().trim().min(1).max(3000),
  cozinhaFoto: z.string().trim().min(1).max(500),
  cozinhaTitulo: z.string().trim().min(1).max(300),
  cozinhaParagrafos: z.array(z.string().trim().min(1).max(3000)).min(1).max(30),
  cozinhaBotao: z.string().trim().min(1).max(80),
});

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json(await getSobre());
}

export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: mensagemZod(parsed.error, ROTULOS) }, { status: 400 });
  }
  const conteudo = { id: "sobre", ...parsed.data };
  await setSobre(conteudo);
  return NextResponse.json(conteudo);
}
