"use client";

import { useEffect, useState } from "react";
import type { FreteFaixa } from "@/lib/db";
import { BtnGhost, BtnPrimary, Card, H1, inputCls } from "@/components/admin/ui";

/*
  Tabela de frete do motoboy, editável (pedido do Ricardo: se Uber/99
  aumentarem, ele ajusta os preços sozinho). Cada linha é "até X km
  custa R$ Y e leva ~Z minutos"; a última linha define o alcance máximo
  da entrega. Os campos ficam como texto livre enquanto edita e são
  validados no salvar.
*/

type Linha = { ateKm: string; valor: string; minutos: string };

const paraLinhas = (fx: FreteFaixa[]): Linha[] =>
  fx.map((f) => ({ ateKm: String(f.ateKm), valor: String(f.valor), minutos: String(f.minutos) }));

export default function AdminFrete() {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [padrao, setPadrao] = useState<FreteFaixa[]>([]);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch("/api/admin/frete")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setLinhas(paraLinhas(d.faixas));
          setPadrao(d.padrao ?? []);
        }
      });
  }, []);

  function mudar(i: number, campo: keyof Linha, valor: string) {
    setLinhas((ls) => ls!.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));
    setMsg("");
    setErro("");
  }

  async function salvar() {
    if (!linhas) return;
    setMsg("");
    setErro("");
    const faixas: FreteFaixa[] = [];
    for (const [i, l] of linhas.entries()) {
      const ateKm = Number(String(l.ateKm).replace(",", "."));
      const valor = Number(String(l.valor).replace(",", "."));
      const minutos = Number(String(l.minutos).replace(",", "."));
      if (!Number.isFinite(ateKm) || ateKm <= 0 || !Number.isFinite(valor) || valor < 0 || !Number.isFinite(minutos) || minutos <= 0) {
        setErro(`Confira a linha ${i + 1}: preencha km, valor e minutos com números.`);
        return;
      }
      faixas.push({ ateKm, valor, minutos: Math.round(minutos) });
    }
    setSalvando(true);
    const res = await fetch("/api/admin/frete", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faixas }),
    });
    setSalvando(false);
    if (res.ok) {
      const d = await res.json();
      setLinhas(paraLinhas(d.faixas));
      setMsg("Tabela salva! Os novos preços já valem para os próximos pedidos.");
    } else {
      const data = await res.json().catch(() => null);
      setErro(data?.erro ?? "Erro ao salvar.");
    }
  }

  const alcance = linhas?.length
    ? linhas[linhas.length - 1].ateKm
    : "";

  return (
    <div>
      <H1>Frete (tabela do motoboy)</H1>
      <p className="mt-1 font-sans text-[13px] text-marrom/60">
        Cada linha diz: até X km a entrega custa R$ Y e leva cerca de Z minutos.
        A última linha é o alcance máximo — acima dela o site oferece Retirada
        ou WhatsApp. Alterou? Clique em Salvar e os novos preços já valem.
      </p>

      {!linhas ? (
        <p className="mt-8 font-sans text-[14px] text-marrom/60">Carregando…</p>
      ) : (
        <div className="mt-6 max-w-2xl">
          <Card>
            <div className="grid grid-cols-[1fr_1fr_1fr_2.5rem] items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-wide text-marrom/60">
              <span>Até (km)</span>
              <span>Valor (R$)</span>
              <span>Tempo (min)</span>
              <span />
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {linhas.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2.5rem] items-center gap-2">
                  <input
                    className={inputCls}
                    inputMode="decimal"
                    value={l.ateKm}
                    onChange={(e) => mudar(i, "ateKm", e.target.value)}
                  />
                  <input
                    className={inputCls}
                    inputMode="decimal"
                    value={l.valor}
                    onChange={(e) => mudar(i, "valor", e.target.value)}
                  />
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    value={l.minutos}
                    onChange={(e) => mudar(i, "minutos", e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={`Remover a faixa ${i + 1}`}
                    onClick={() => {
                      setLinhas((ls) => ls!.filter((_, j) => j !== i));
                      setMsg("");
                      setErro("");
                    }}
                    disabled={linhas.length === 1}
                    className="justify-self-center font-sans text-lg leading-none text-vinho/70 hover:text-vinho disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <BtnGhost
                onClick={() => {
                  const ultima = linhas[linhas.length - 1];
                  const km = Number(String(ultima?.ateKm ?? "0").replace(",", "."));
                  setLinhas((ls) => [
                    ...ls!,
                    {
                      ateKm: String(Number.isFinite(km) ? km + 1 : 1),
                      valor: ultima?.valor ?? "",
                      minutos: ultima?.minutos ?? "",
                    },
                  ]);
                }}
              >
                + Adicionar faixa
              </BtnGhost>
              <BtnGhost
                onClick={() => {
                  setLinhas(paraLinhas(padrao));
                  setMsg("");
                  setErro("");
                }}
                disabled={padrao.length === 0}
              >
                Restaurar tabela original
              </BtnGhost>
            </div>

            <p className="mt-4 font-sans text-[12px] text-marrom/60">
              Alcance da entrega: até <b>{alcance || "?"} km</b>. Quer dar frete
              grátis numa promoção? Prefira criar um cupom — a tabela aqui é o
              custo normal do motoboy.
            </p>

            <BtnPrimary className="mt-4" disabled={salvando} onClick={salvar}>
              {salvando ? "Salvando..." : "Salvar tabela"}
            </BtnPrimary>

            {msg && (
              <p className="mt-3 font-sans text-[13px] font-semibold text-green-700">{msg}</p>
            )}
            {erro && (
              <p className="mt-3 font-sans text-[13px] font-semibold text-vinho">{erro}</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
