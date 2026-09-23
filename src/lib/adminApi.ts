import { NextResponse } from "next/server";
import { getSession } from "./auth";

/** Retorna uma resposta 401 se não houver sessão de admin; senão, null. */
export async function guard(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  return null;
}

import type { ZodError } from "zod";

/**
 * Transforma o erro de validação (zod) numa frase que o Ricardo entende:
 * qual campo está errado e por quê. `rotulos` mapeia o nome técnico do
 * campo para o nome que aparece na tela do painel.
 */
export function mensagemZod(err: ZodError, rotulos: Record<string, string> = {}): string {
  const issue = err.issues[0];
  if (!issue) return "Dados inválidos.";
  const chave = String(issue.path[0] ?? "");
  const idx = typeof issue.path[1] === "number" ? ` (item ${issue.path[1] + 1})` : "";
  const campo = (rotulos[chave] ?? chave) + idx;
  const i = issue as { code: string; maximum?: number; minimum?: number; type?: string };
  if (i.code === "too_big") {
    return `O campo "${campo}" passou do limite de ${i.maximum} ${i.type === "array" ? "itens" : "caracteres"}.`;
  }
  if (i.code === "too_small") {
    return i.type === "array"
      ? `O campo "${campo}" precisa ter pelo menos ${i.minimum} item(ns).`
      : `O campo "${campo}" não pode ficar vazio.`;
  }
  return `Confira o campo "${campo}": ${issue.message}`;
}
