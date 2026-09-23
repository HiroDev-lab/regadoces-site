"use client";

import { useEffect, useState } from "react";
import type { Testimonial } from "@/lib/db";
import { BtnGhost, BtnPrimary, Card, Field, H1, inputCls } from "@/components/admin/ui";

/*
  Avaliações do Google (antes "depoimentos"): o Ricardo copia as
  avaliações do perfil do Google e cadastra aqui — o site mostra na
  Home (4 por vez, carrossel) e na página /depoimentos. No topo, os
  dados do perfil (link p/ avaliar, nota média e total).
*/

type NovaAvaliacao = { nome: string; sobrenome: string; texto: string; nota: number };
const NOVA: NovaAvaliacao = { nome: "", sobrenome: "", texto: "", nota: 5 };

export default function AdminDepoimentos() {
  const [lista, setLista] = useState<Testimonial[]>([]);
  const [google, setGoogle] = useState({ link: "", nota: 5, total: 0 });
  const [msgGoogle, setMsgGoogle] = useState("");
  const [nova, setNova] = useState<NovaAvaliacao | null>(null);
  const [msgNova, setMsgNova] = useState("");

  async function carregar() {
    const res = await fetch("/api/admin/testimonials");
    if (res.ok) setLista(await res.json());
    const g = await fetch("/api/admin/google");
    if (g.ok) setGoogle(await g.json());
  }
  useEffect(() => {
    carregar();
  }, []);

  async function salvarGoogle() {
    setMsgGoogle("");
    const res = await fetch("/api/admin/google", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        link: google.link.trim(),
        nota: Number(google.nota),
        total: Number(google.total),
      }),
    });
    setMsgGoogle(res.ok ? "Salvo! ✓" : "Erro ao salvar.");
    setTimeout(() => setMsgGoogle(""), 2500);
  }

  async function salvarNova() {
    if (!nova) return;
    setMsgNova("");
    const res = await fetch("/api/admin/testimonials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nova, nota: Number(nova.nota) }),
    });
    if (res.ok) {
      setNova(null);
      carregar();
    } else {
      const d = await res.json().catch(() => null);
      setMsgNova(d?.erro ?? "Erro ao salvar.");
    }
  }

  async function atualizar(id: string, dados: { aprovado?: boolean; nota?: number }) {
    await fetch("/api/admin/testimonials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...dados }),
    });
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta avaliação?")) return;
    await fetch(`/api/admin/testimonials?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    carregar();
  }

  const pendentes = lista.filter((t) => !t.aprovado);
  const aprovados = lista.filter((t) => t.aprovado);

  return (
    <div>
      <div className="flex items-center justify-between">
        <H1>Avaliações do Google</H1>
        <BtnPrimary onClick={() => setNova({ ...NOVA })}>+ Adicionar avaliação</BtnPrimary>
      </div>
      <p className="mt-1 font-sans text-[13px] text-marrom/60">
        Copie as avaliações do perfil do Google e cadastre aqui. As aprovadas aparecem na Home (4 por vez) e na página Depoimentos.
      </p>

      {/* dados do perfil no Google */}
      <Card className="mt-6">
        <h2 className="font-sans text-lg font-bold text-marrom">Dados do perfil no Google</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Field label='Link "Avalie no Google" (link do perfil ou de avaliação)'>
              <input
                className={inputCls}
                placeholder="https://g.page/r/..."
                value={google.link}
                onChange={(e) => setGoogle({ ...google, link: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Nota média (ex: 5.0)">
            <input
              type="number" min="1" max="5" step="0.1" className={inputCls}
              value={google.nota}
              onChange={(e) => setGoogle({ ...google, nota: Number(e.target.value) })}
            />
          </Field>
          <Field label="Total de avaliações no Google">
            <input
              type="number" min="0" className={inputCls}
              value={google.total}
              onChange={(e) => setGoogle({ ...google, total: Number(e.target.value) })}
            />
          </Field>
          <div className="flex items-end gap-3">
            <BtnPrimary onClick={salvarGoogle}>Salvar</BtnPrimary>
            {msgGoogle && <span className="pb-2 font-sans text-[13px] text-marrom/70">{msgGoogle}</span>}
          </div>
        </div>
      </Card>

      {[
        { titulo: `Aguardando aprovação (${pendentes.length})`, itens: pendentes },
        { titulo: `Publicadas (${aprovados.length})`, itens: aprovados },
      ].map((grupo) => (
        <div key={grupo.titulo} className="mt-8">
          <h2 className="font-sans text-lg font-bold text-marrom">{grupo.titulo}</h2>
          <div className="mt-3 flex flex-col gap-3">
            {grupo.itens.length === 0 && (
              <p className="font-sans text-[13px] text-marrom/50">Nenhuma.</p>
            )}
            {grupo.itens.map((t) => (
              <Card key={t.id}>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-[15px] font-semibold text-marrom">
                      {t.nome} {t.sobrenome}
                      {t.email && (
                        <span className="ml-2 font-normal text-marrom/50">{t.email}</span>
                      )}
                    </p>
                    <p className="mt-1 font-sans text-[14px] leading-relaxed text-marrom/80">
                      {t.texto}
                    </p>
                  </div>
                  <select
                    value={t.nota ?? 5}
                    onChange={(e) => atualizar(t.id, { nota: Number(e.target.value) })}
                    className="rounded-md border border-marrom/20 bg-white px-2 py-2 font-sans text-[13px] text-marrom"
                    title="Estrelas da avaliação"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {"★".repeat(n)} ({n})
                      </option>
                    ))}
                  </select>
                  {t.aprovado ? (
                    <BtnGhost onClick={() => atualizar(t.id, { aprovado: false })}>Ocultar</BtnGhost>
                  ) : (
                    <BtnGhost onClick={() => atualizar(t.id, { aprovado: true })} className="!border-green-600 !text-green-700">
                      Aprovar
                    </BtnGhost>
                  )}
                  <BtnGhost onClick={() => excluir(t.id)} className="!text-red-700">
                    Excluir
                  </BtnGhost>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* modal: nova avaliação */}
      {nova && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-marrom/50 p-6">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-xl">
            <h2 className="font-sans text-xl font-bold text-marrom">Adicionar avaliação</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nome">
                <input className={inputCls} value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} />
              </Field>
              <Field label="Sobrenome">
                <input className={inputCls} value={nova.sobrenome} onChange={(e) => setNova({ ...nova, sobrenome: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Texto da avaliação">
                  <textarea rows={4} className={inputCls} value={nova.texto} onChange={(e) => setNova({ ...nova, texto: e.target.value })} />
                </Field>
              </div>
              <Field label="Estrelas">
                <select className={inputCls} value={nova.nota} onChange={(e) => setNova({ ...nova, nota: Number(e.target.value) })}>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {"★".repeat(n)} ({n})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {msgNova && <p className="mt-3 font-sans text-sm text-vinho">{msgNova}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <BtnGhost onClick={() => setNova(null)}>Cancelar</BtnGhost>
              <BtnPrimary onClick={salvarNova}>Salvar</BtnPrimary>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
