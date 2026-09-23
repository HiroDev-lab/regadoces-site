import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { readCollection, writeCollection } from "./db";
import {
  COOKIE_NAME,
  sessionCookieOptions,
  signSessionToken,
  verifySessionToken,
} from "./sessionToken";

/*
  =====================================================================
  AUTENTICAÇÃO DO PAINEL ADMINISTRADOR
  ---------------------------------------------------------------------
  - Senha guardada com hash bcrypt (nunca em texto puro) em data/admins.json.
    QUANDO LIGAR O SUPABASE: mover para a tabela `admins` (schema.sql),
    o hash continua sendo bcrypt — nada muda na lógica.
  - Sessão via JWT assinado (HS256) em cookie httpOnly, 30 dias, renovada
    automaticamente pelo middleware enquanto o painel é usado
    (detalhes em src/lib/sessionToken.ts).
  - SESSION_SECRET vem do .env — troque em produção!
  =====================================================================
*/

export type AdminUser = {
  id: string;
  email: string;
  senhaHash: string;
  nome: string;
};

export async function verifyCredentials(
  email: string,
  senha: string
): Promise<AdminUser | null> {
  const admins = await readCollection<AdminUser>("admins");
  const admin = admins.find(
    (a) => a.email.toLowerCase() === email.toLowerCase()
  );
  if (!admin) {
    // compara com hash fake para manter tempo de resposta constante
    await bcrypt.compare(senha, "$2a$12$C6UzMDM.H6dfI/f/IKcEeO");
    return null;
  }
  const ok = await bcrypt.compare(senha, admin.senhaHash);
  return ok ? admin : null;
}

export async function changePassword(email: string, novaSenha: string) {
  const admins = await readCollection<AdminUser>("admins");
  const idx = admins.findIndex(
    (a) => a.email.toLowerCase() === email.toLowerCase()
  );
  if (idx === -1) throw new Error("Admin não encontrado");
  admins[idx].senhaHash = await bcrypt.hash(novaSenha, 12);
  await writeCollection("admins", admins);
}

export async function createSession(admin: AdminUser) {
  const token = await signSessionToken({ sub: admin.id, email: admin.email });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, sessionCookieOptions());
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<{ email: string } | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  return payload ? { email: String(payload.email) } : null;
}

/** Usado pelas rotas /api/admin/* — lança 401 se não autenticado */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Response(JSON.stringify({ erro: "Não autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}
