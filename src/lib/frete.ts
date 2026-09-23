/*
  Frete por distância — motoboy saindo da Regadoces:
  Rua Doutor Generoso Borges, 317 — Batel, Curitiba/PR (CEP 80440-010).

  Como funciona:
  1. o CEP do cliente vira coordenada (cep.awesomeapi.com.br; reserva:
     BrasilAPI) — só CEPs brasileiros;
  2. a distância de carro é calculada na rota real (OSRM público); se o
     serviço estiver fora, cai para a linha reta x 1,35 (aproximação);
  3. o valor sai da tabela de faixas (editável no painel em "Frete";
     padrão = tabela do Ricardo, até 15 km). Acima da última faixa, sem
     entrega de motoboy — o cliente pode retirar ou chamar no WhatsApp.

  Usado pela rota /api/frete (cotação no carrinho) e pelo /api/checkout
  (valor cobrado de verdade — o navegador nunca é fonte de verdade).
*/

import { getFreteTabela } from "@/lib/db";

const ORIGEM = { lat: -25.4395571, lng: -49.2948491 };

export type Frete =
  | { ok: true; valor: number; km: number; minutos: number }
  | { ok: false; erro: string };

// cache em memória: o mesmo CEP não consulta as APIs de novo (cotação
// no carrinho + cobrança no checkout usam a mesma distância). Só a
// distância fica em cache — o preço é recalculado da tabela a cada
// chamada, para uma edição no painel valer na hora.
const cacheKm = new Map<string, number>();

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": "regadoces-site/1.0 (regadoces.com.br)" },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function geocodeCep(cep: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const d = (await fetchJson(`https://cep.awesomeapi.com.br/json/${cep}`)) as {
      lat?: string;
      lng?: string;
    };
    const lat = Number(d.lat);
    const lng = Number(d.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0) return { lat, lng };
  } catch {}
  try {
    const d = (await fetchJson(`https://brasilapi.com.br/api/cep/v2/${cep}`)) as {
      location?: { coordinates?: { latitude?: string; longitude?: string } };
    };
    const lat = Number(d.location?.coordinates?.latitude);
    const lng = Number(d.location?.coordinates?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0) return { lat, lng };
  } catch {}
  return null;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function distanciaKm(destino: { lat: number; lng: number }): Promise<number> {
  try {
    const d = (await fetchJson(
      `https://router.project-osrm.org/route/v1/driving/${ORIGEM.lng},${ORIGEM.lat};${destino.lng},${destino.lat}?overview=false`
    )) as { code?: string; routes?: { distance: number }[] };
    if (d.code === "Ok" && d.routes?.[0]) return d.routes[0].distance / 1000;
  } catch {}
  // reserva: linha reta com fator de rota urbana
  return haversineKm(ORIGEM, destino) * 1.35;
}

export async function calcularFrete(cepBruto: string): Promise<Frete> {
  const cep = cepBruto.replace(/\D/g, "");
  if (cep.length !== 8) return { ok: false, erro: "CEP inválido." };

  let km = cacheKm.get(cep);
  if (km === undefined) {
    const destino = await geocodeCep(cep);
    if (!destino) {
      return { ok: false, erro: "Não encontramos esse CEP. Confira os números." };
    }
    km = Math.round((await distanciaKm(destino)) * 10) / 10;
    if (cacheKm.size > 500) cacheKm.clear();
    cacheKm.set(cep, km);
  }

  const tabela = await getFreteTabela();
  const kmMax = tabela[tabela.length - 1].ateKm;
  const faixa = tabela.find((f) => (km as number) <= f.ateKm);
  if (!faixa) {
    return {
      ok: false,
      erro: `Esse endereço fica a ~${km} km — fora da nossa área de entrega por motoboy (até ${kmMax} km). Você pode escolher Retirada ou falar com a gente no WhatsApp.`,
    };
  }
  return { ok: true, valor: faixa.valor, km, minutos: faixa.minutos };
}
