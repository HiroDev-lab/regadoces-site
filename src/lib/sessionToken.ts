import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/*
  =====================================================================
  TOKEN DE SESSÃO DO PAINEL (compartilhado por auth.ts e middleware.ts)
  ---------------------------------------------------------------------
  Só usa `jose` (funciona no Edge do middleware) — nada de fs/bcrypt aqui.

  Regra da sessão: dura SESSION_DAYS e é RENOVADA pelo middleware sempre
  que o painel é usado (no máximo 1 vez por RENEW_AFTER_SECONDS). Ou seja,
  o Ricardo só é deslogado se ficar SESSION_DAYS sem abrir o painel.
  (Antes a sessão vencia 8h depois do login mesmo com o painel aberto,
  e a tela respondia "Não autorizado" na hora de salvar.)
  =====================================================================
*/

export const COOKIE_NAME = "rega_admin";
export const SESSION_DAYS = 30;
export const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;
/** renova o cookie se o token tiver mais de 1 hora de vida */
export const RENEW_AFTER_SECONDS = 60 * 60;

function getSecret(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ??
    "dev-secret-trocar-em-producao-9f8a7b6c5d4e";
  return new TextEncoder().encode(secret);
}

export type SessionPayload = JWTPayload & { sub: string; email: string };

export async function signSessionToken(dados: { sub: string; email: string }) {
  return new SignJWT({ sub: dados.sub, email: dados.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || !payload.email) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  };
}
