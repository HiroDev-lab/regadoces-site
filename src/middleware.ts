import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_NAME,
  RENEW_AFTER_SECONDS,
  sessionCookieOptions,
  signSessionToken,
  verifySessionToken,
} from "@/lib/sessionToken";

/*
  =====================================================================
  MIDDLEWARE — cabeçalhos de segurança
  ---------------------------------------------------------------------
  A URL secreta do painel é a própria pasta src/app/painel
  (não existe /admin). Para trocar a URL do painel: renomear essa pasta
  e atualizar ADMIN_SLUG no .env (o painel usa o 1º segmento da URL
  como base para os links, então nada mais precisa mudar).

  Obs.: a versão anterior fazia rewrite de /<slug> para /admin; na
  hospedagem (Passenger) o Next tratava o rewrite como proxy externo e
  quebrava (500/404). Sem rewrite, funciona em qualquer hospedagem.
  Também RENOVA a sessão do painel: se o pedido vier com o cookie do
  admin válido e com mais de 1h de vida, devolve um cookie novo (30 dias).
  Assim o Ricardo não é deslogado no meio do trabalho.
  =====================================================================
*/
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    const payload = await verifySessionToken(token);
    const idade = payload?.iat ? Date.now() / 1000 - payload.iat : 0;
    if (payload && idade > RENEW_AFTER_SECONDS) {
      const novo = await signSessionToken({ sub: payload.sub, email: payload.email });
      res.cookies.set(COOKIE_NAME, novo, sessionCookieOptions());
    }
  }

  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|uploads|fotos).*)"],
};
