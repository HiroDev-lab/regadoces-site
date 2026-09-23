import crypto from "crypto";
import { readCollection, writeCollection } from "@/lib/db";

/*
  Contador de visitas próprio (pedido do Ricardo: "quantas visitas no
  dia/mês e de onde"). Um registro por DIA na coleção `visits`:
    { id: "2026-08-31", pageviews, visitantes: {hash: 1}, cidades: {"Curitiba/PR": n}, paginas: {"/": n} }
  O visitante é contado por um hash do IP (não guardamos o IP em si).
  A cidade vem do ipwho.is (grátis, sem chave) com cache em memória.
*/

export type DiaVisitas = {
  id: string; // "2026-08-31"
  pageviews: number;
  visitantes: Record<string, 1>;
  cidades: Record<string, number>;
  paginas: Record<string, number>;
};

const geoCache = new Map<string, string>(); // ip → "Cidade/UF" ("" = não achou)

async function cidadeDoIp(ip: string): Promise<string> {
  if (!ip || ip === "127.0.0.1" || ip === "::1") return "";
  const cache = geoCache.get(ip);
  if (cache !== undefined) return cache;
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,city,region_code,country_code`, {
      signal: AbortSignal.timeout(4000),
    });
    const d = await res.json();
    const cidade =
      d?.success && d.city
        ? d.country_code === "BR"
          ? `${d.city}/${d.region_code ?? ""}`.replace(/\/$/, "")
          : `${d.city} (${d.country_code})`
        : "";
    if (geoCache.size > 5000) geoCache.clear();
    geoCache.set(ip, cidade);
    return cidade;
  } catch {
    return "";
  }
}

export async function registrarVisita(path: string, ip: string): Promise<void> {
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }); // YYYY-MM-DD
  const hash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 12);
  const cidade = await cidadeDoIp(ip);

  const dias = await readCollection<DiaVisitas>("visits");
  let dia = dias.find((d) => d.id === hoje);
  if (!dia) {
    dia = { id: hoje, pageviews: 0, visitantes: {}, cidades: {}, paginas: {} };
    dias.push(dia);
  }
  dia.pageviews += 1;
  if (Object.keys(dia.visitantes).length < 5000) dia.visitantes[hash] = 1;
  if (cidade) dia.cidades[cidade] = (dia.cidades[cidade] ?? 0) + 1;
  dia.paginas[path] = (dia.paginas[path] ?? 0) + 1;

  // guarda no máximo 400 dias
  dias.sort((a, b) => a.id.localeCompare(b.id));
  await writeCollection("visits", dias.slice(-400));
}

/** Soma visitas dos últimos N dias (N=1 → só hoje). */
export function resumoVisitas(dias: DiaVisitas[], ultimosDias: number) {
  const corte = new Date(Date.now() - (ultimosDias - 1) * 86400000)
    .toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const periodo = dias.filter((d) => d.id >= corte);
  const pageviews = periodo.reduce((s, d) => s + d.pageviews, 0);
  const visitantes = periodo.reduce((s, d) => s + Object.keys(d.visitantes).length, 0);
  const cidades: Record<string, number> = {};
  for (const d of periodo)
    for (const [c, n] of Object.entries(d.cidades)) cidades[c] = (cidades[c] ?? 0) + n;
  const topCidades = Object.entries(cidades)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  return { pageviews, visitantes, topCidades };
}
