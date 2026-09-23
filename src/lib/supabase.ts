import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
  =====================================================================
  SUPABASE
  ---------------------------------------------------------------------
  O site liga o Supabase sozinho quando estas variáveis existem:
       NEXT_PUBLIC_SUPABASE_URL
       SUPABASE_SERVICE_ROLE_KEY   (somente no servidor — nunca no navegador)
  Sem elas, tudo continua funcionando com os arquivos JSON de /data
  (modo local, usado no computador do Jean e do designer).

  Como o site é pequeno (uma doceria), cada "coleção" (produtos, cupons,
  posts…) é guardada inteira como JSON na tabela `collections`
  (ver supabase/schema.sql). Assim nenhuma outra parte do código muda:
  readCollection/writeCollection em src/lib/db.ts leem e gravam a
  coleção inteira, exatamente como faziam com os arquivos.

  Fotos enviadas pelo painel vão para o bucket público `uploads`
  (Supabase Storage) — em hospedagem serverless o disco não persiste.
  =====================================================================
*/

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

let client: SupabaseClient | null = null;

/** Cliente de servidor (service role). Só usar em rotas/páginas do servidor. */
export function supabaseServer(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return client;
}

export const UPLOADS_BUCKET = "uploads";
