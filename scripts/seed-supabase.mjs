// Envia os arquivos de /data (JSON) para a tabela `collections` do Supabase.
// Uso (uma vez, depois de rodar supabase/schema.sql):
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-supabase.mjs
// Por padrão NÃO sobrescreve coleções que já existem no banco; use --force para sobrescrever.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const force = process.argv.includes("--force");
const sb = createClient(url, key, { auth: { persistSession: false } });
const dir = join(process.cwd(), "data");

for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const name = f.replace(/\.json$/, "");
  const data = JSON.parse(readFileSync(join(dir, f), "utf8").replace(/^﻿/, ""));
  if (!force) {
    const { data: existente } = await sb.from("collections").select("name").eq("name", name).maybeSingle();
    if (existente) { console.log(`- ${name}: já existe no banco, mantido (use --force para sobrescrever)`); continue; }
  }
  const { error } = await sb.from("collections").upsert({ name, data, updated_at: new Date().toISOString() }, { onConflict: "name" });
  console.log(error ? `x ${name}: ${error.message}` : `✓ ${name}: ${Array.isArray(data) ? data.length : 1} registros`);
}
