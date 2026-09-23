"use client";

import { useEffect, useState } from "react";
import type { FaqItem } from "@/lib/db";
import {
  BtnGhost,
  BtnPrimary,
  Card,
  Field,
  H1,
  Toggle,
  inputCls,
} from "@/components/admin/ui";

/*
  FAQ da Home (pedido do Ricardo, 02/09): criar, editar, ordenar (setas),
  ligar/desligar e excluir perguntas. Enter na resposta vira quebra de
  linha no site.
*/
type Form = Omit<FaqItem, "id" | "ordem"> & { id?: string; ordem?: number };

const VAZIO: Form = { pergunta: "", resposta: "", ativo: true };

export default function AdminFaq() {
  const [lista, setLista] = useState<FaqItem[] | null>(null);
  const [editando, setEditando] = useState<Form | null>(null);
  const [msg, setMsg] = useState("");
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const res = await fetch("/api/admin/faq");
    if (res.ok) setLista(await res.json());
  }
  useEffect(() => {
    carregar();
  }, []);

  async function salvar() {
    if (!editando) return;
    setMsg("");
    setSalvando(true);
    const res = await fetch("/api/admin/faq", {
      method: editando.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editando,
        ordem: editando.ordem ?? (lista?.length ?? 0) + 1,
      }),
    });
    setSalvando(false);
    if (res.ok) {
      setEditando(null);
      setAviso("Salvo! Já está valendo no site.");
      carregar();
    } else {
      const data = await res.json().catch(() => null);
      setMsg(data?.erro ?? "Erro ao salvar.");
    }
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta pergunta?")) return;
    await fetch(`/api/admin/faq?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setAviso("Pergunta excluída.");
    carregar();
  }

  async function alternar(item: FaqItem) {
    await fetch("/api/admin/faq", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, ativo: !item.ativo }),
    });
    carregar();
  }

  async function mover(i: number, delta: number) {
    if (!lista) return;
    const j = i + delta;
    if (j < 0 || j >= lista.length) return;
    const nova = [...lista];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    setLista(nova.map((f, k) => ({ ...f, ordem: k + 1 })));
    await fetch("/api/admin/faq", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: nova.map((f) => f.id) }),
    });
    carregar();
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <H1>FAQ (perguntas frequentes)</H1>
        <BtnPrimary onClick={() => { setMsg(""); setAviso(""); setEditando({ ...VAZIO }); }}>
          + Nova pergunta
        </BtnPrimary>
      </div>
      <p className="mt-1 font-sans text-[13px] text-marrom/60">
        As perguntas e respostas da seção FAQ da Home, na ordem em que
        aparecem. Use as setas para reordenar; perguntas desligadas somem do
        site sem serem apagadas.
      </p>
      {aviso && <p className="mt-3 font-sans text-[13px] font-semibold text-green-700">{aviso}</p>}

      {!lista ? (
        <p className="mt-8 font-sans text-[14px] text-marrom/60">Carregando…</p>
      ) : (
        <div className="mt-6 flex max-w-3xl flex-col gap-3">
          {lista.map((f, i) => (
            <Card key={f.id}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex flex-col">
                  <button type="button" aria-label="Subir" onClick={() => mover(i, -1)} disabled={i === 0} className="px-1 text-marrom/60 hover:text-marrom disabled:opacity-25">▲</button>
                  <button type="button" aria-label="Descer" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} className="px-1 text-marrom/60 hover:text-marrom disabled:opacity-25">▼</button>
                </div>
                <div className="min-w-[200px] flex-1">
                  <p className="font-sans text-[15px] font-semibold text-marrom">
                    {i + 1}. {f.pergunta}
                  </p>
                  <p className="mt-1 line-clamp-2 whitespace-pre-line font-sans text-[13px] text-marrom/60">
                    {f.resposta}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Toggle checked={f.ativo} onChange={() => alternar(f)} label={f.ativo ? "no ar" : "desligada"} />
                  <BtnGhost onClick={() => { setMsg(""); setAviso(""); setEditando(f); }}>Editar</BtnGhost>
                  <BtnGhost onClick={() => excluir(f.id)} className="!text-red-700">Excluir</BtnGhost>
                </div>
              </div>
            </Card>
          ))}
          {lista.length === 0 && (
            <p className="font-sans text-[14px] text-marrom/60">Nenhuma pergunta cadastrada.</p>
          )}
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-marrom/50 p-6">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-7 shadow-xl">
            <h2 className="font-sans text-xl font-bold text-marrom">
              {editando.id ? "Editar pergunta" : "Nova pergunta"}
            </h2>
            <div className="mt-5 flex flex-col gap-4">
              <Field label="Pergunta">
                <input
                  className={inputCls}
                  value={editando.pergunta}
                  onChange={(e) => setEditando({ ...editando, pergunta: e.target.value })}
                />
              </Field>
              <Field label="Resposta (Enter vira quebra de linha no site)">
                <textarea
                  className={inputCls + " min-h-[160px]"}
                  value={editando.resposta}
                  onChange={(e) => setEditando({ ...editando, resposta: e.target.value })}
                />
              </Field>
              <Toggle
                checked={editando.ativo}
                onChange={(v) => setEditando({ ...editando, ativo: v })}
                label={editando.ativo ? "No ar" : "Desligada (não aparece no site)"}
              />
            </div>
            {msg && <p className="mt-3 font-sans text-sm text-vinho">{msg}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <BtnGhost onClick={() => setEditando(null)}>Cancelar</BtnGhost>
              <BtnPrimary disabled={salvando} onClick={salvar}>
                {salvando ? "Salvando..." : "Salvar"}
              </BtnPrimary>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
