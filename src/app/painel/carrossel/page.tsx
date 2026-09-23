"use client";

import { useEffect, useState } from "react";
import type { Slide } from "@/lib/db";
import {
  BtnGhost,
  BtnPrimary,
  Card,
  Field,
  H1,
  ImageUpload,
  Toggle,
  inputCls,
} from "@/components/admin/ui";

/* Troca fácil dos slides do carrossel da Home. */
type Form = Omit<Slide, "id"> & { id?: string };

const VAZIO: Form = {
  imagem: "",
  titulo: "Regadoces",
  frase: "",
  subtitulo: "",
  textoBotao: "COMPRE SEUS REGADOCES",
  linkBotao: "/produtos",
  overlay: "vinho",
  ordem: 1,
  ativo: true,
};

export default function AdminCarrossel() {
  const [lista, setLista] = useState<Slide[]>([]);
  const [editando, setEditando] = useState<Form | null>(null);
  const [msg, setMsg] = useState("");

  async function carregar() {
    const res = await fetch("/api/admin/carousel");
    if (res.ok) setLista(await res.json());
  }
  useEffect(() => {
    carregar();
  }, []);

  async function salvar() {
    if (!editando) return;
    setMsg("");
    const res = await fetch("/api/admin/carousel", {
      method: editando.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editando, ordem: Number(editando.ordem) }),
    });
    if (res.ok) {
      setEditando(null);
      carregar();
    } else {
      const data = await res.json().catch(() => null);
      setMsg(data?.erro ?? "Erro ao salvar.");
    }
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este slide?")) return;
    await fetch(`/api/admin/carousel?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    carregar();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <H1>Carrossel da Home</H1>
        <BtnPrimary onClick={() => setEditando({ ...VAZIO, ordem: lista.length + 1 })}>
          + Novo slide
        </BtnPrimary>
      </div>
      <p className="mt-1 font-sans text-[13px] text-marrom/60">
        Os slides ativos giram automaticamente no topo da Home, na ordem definida.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {lista.map((s) => (
          <Card key={s.id}>
            <div className="flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.imagem} alt="" className="h-14 w-24 rounded-md object-cover" />
              <div className="min-w-[160px] flex-1">
                <p className="truncate font-sans text-[15px] font-semibold text-marrom">
                  {s.ordem}º — {s.frase || "(sem frase)"}
                </p>
                <p className="truncate font-sans text-[13px] text-marrom/60">
                  botão: {s.textoBotao} → {s.linkBotao}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 font-sans text-[12px] font-semibold ${
                  s.ativo ? "bg-green-100 text-green-700" : "bg-marrom/10 text-marrom/60"
                }`}
              >
                {s.ativo ? "no ar" : "desativado"}
              </span>
              <BtnGhost onClick={() => setEditando(s)}>Editar</BtnGhost>
              <BtnGhost onClick={() => excluir(s.id)} className="!text-red-700">Excluir</BtnGhost>
            </div>
          </Card>
        ))}
      </div>

      {editando && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-marrom/50 p-6">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-7 shadow-xl">
            <h2 className="font-sans text-xl font-bold text-marrom">
              {editando.id ? "Editar slide" : "Novo slide"}
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Imagem de fundo">
                  <ImageUpload value={editando.imagem} onChange={(url) => setEditando({ ...editando, imagem: url })} />
                </Field>
              </div>
              <Field label="Título (Regadoces)">
                <input className={inputCls} value={editando.titulo} onChange={(e) => setEditando({ ...editando, titulo: e.target.value })} />
              </Field>
              <Field label="Frase principal">
                <input className={inputCls} value={editando.frase} onChange={(e) => setEditando({ ...editando, frase: e.target.value })} />
              </Field>
              <Field label="Subtítulo (use *palavra* para negrito)">
                <input className={inputCls} value={editando.subtitulo} onChange={(e) => setEditando({ ...editando, subtitulo: e.target.value })} />
              </Field>
              <Field label="Texto do botão">
                <input className={inputCls} value={editando.textoBotao} onChange={(e) => setEditando({ ...editando, textoBotao: e.target.value })} />
              </Field>
              <Field label="Link do botão (ex.: /produtos)">
                <input className={inputCls} value={editando.linkBotao} onChange={(e) => setEditando({ ...editando, linkBotao: e.target.value })} />
              </Field>
              <Field label="Tom por cima da foto">
                <select
                  className={inputCls}
                  value={editando.overlay ?? "vinho"}
                  onChange={(e) => setEditando({ ...editando, overlay: e.target.value as Slide["overlay"] })}
                >
                  <option value="vinho">Vinho (padrão)</option>
                  <option value="marrom">Marrom</option>
                  <option value="nenhum">Nenhum (foto limpa)</option>
                </select>
              </Field>
              <Field label="Ordem">
                <input type="number" min="1" className={inputCls} value={editando.ordem} onChange={(e) => setEditando({ ...editando, ordem: Number(e.target.value) })} />
              </Field>
              <div className="flex items-end pb-1">
                <Toggle checked={editando.ativo} onChange={(v) => setEditando({ ...editando, ativo: v })} label={editando.ativo ? "No ar" : "Desativado"} />
              </div>
            </div>
            {msg && <p className="mt-3 font-sans text-sm text-vinho">{msg}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <BtnGhost onClick={() => setEditando(null)}>Cancelar</BtnGhost>
              <BtnPrimary onClick={salvar}>Salvar</BtnPrimary>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
