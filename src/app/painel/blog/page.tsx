"use client";

import { useEffect, useState } from "react";
import type { Post } from "@/lib/db";
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

/*
  Construtor simples do blog: título + capa + resumo + conteúdo em
  parágrafos (separados por linha em branco). Sem HTML — seguro.
*/
type Form = Omit<Post, "id" | "slug" | "criadoEm"> & { id?: string };

const VAZIO: Form = {
  titulo: "",
  capa: "",
  resumo: "",
  conteudo: "",
  destaque: false,
  ordem: 1,
  ativo: true,
};

export default function AdminBlog() {
  const [lista, setLista] = useState<Post[]>([]);
  const [editando, setEditando] = useState<Form | null>(null);
  const [msg, setMsg] = useState("");

  async function carregar() {
    const res = await fetch("/api/admin/posts");
    if (res.ok) setLista(await res.json());
  }
  useEffect(() => {
    carregar();
  }, []);

  async function salvar() {
    if (!editando) return;
    setMsg("");
    const res = await fetch("/api/admin/posts", {
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
    if (!confirm("Excluir esta matéria?")) return;
    await fetch(`/api/admin/posts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    carregar();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <H1>Blog / Na Mídia</H1>
        <BtnPrimary onClick={() => setEditando({ ...VAZIO, ordem: lista.length + 1 })}>
          + Nova matéria
        </BtnPrimary>
      </div>
      <p className="mt-1 font-sans text-[13px] text-marrom/60">
        A matéria marcada como destaque aparece no topo da página do blog.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {lista.map((p) => (
          <Card key={p.id}>
            <div className="flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.capa || "/images/brand/logo-blob.png"} alt="" className="h-14 w-20 rounded-md object-cover" />
              <div className="min-w-[160px] flex-1">
                <p className="truncate font-sans text-[15px] font-semibold text-marrom">
                  {p.destaque && "⭐ "}
                  {p.titulo}
                </p>
                <p className="font-sans text-[13px] text-marrom/60">
                  /blog/{p.slug} · ordem {p.ordem}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 font-sans text-[12px] font-semibold ${
                  p.ativo ? "bg-green-100 text-green-700" : "bg-marrom/10 text-marrom/60"
                }`}
              >
                {p.ativo ? "publicada" : "rascunho"}
              </span>
              <BtnGhost onClick={() => setEditando(p)}>Editar</BtnGhost>
              <BtnGhost onClick={() => excluir(p.id)} className="!text-red-700">Excluir</BtnGhost>
            </div>
          </Card>
        ))}
      </div>

      {editando && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-marrom/50 p-6">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-7 shadow-xl">
            <h2 className="font-sans text-xl font-bold text-marrom">
              {editando.id ? "Editar matéria" : "Nova matéria"}
            </h2>
            <div className="mt-5 flex flex-col gap-4">
              <Field label="Título">
                <input className={inputCls} value={editando.titulo} onChange={(e) => setEditando({ ...editando, titulo: e.target.value })} />
              </Field>
              <Field label="Capa">
                <ImageUpload value={editando.capa} onChange={(url) => setEditando({ ...editando, capa: url })} />
              </Field>
              <Field label="Resumo (aparece nas listagens)">
                <input className={inputCls} value={editando.resumo} onChange={(e) => setEditando({ ...editando, resumo: e.target.value })} />
              </Field>
              <Field label="Conteúdo (separe os parágrafos com uma linha em branco)">
                <textarea rows={10} className={inputCls} value={editando.conteudo} onChange={(e) => setEditando({ ...editando, conteudo: e.target.value })} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Ordem">
                  <input type="number" min="1" className={inputCls} value={editando.ordem} onChange={(e) => setEditando({ ...editando, ordem: Number(e.target.value) })} />
                </Field>
                <div className="flex items-end pb-1">
                  <Toggle checked={editando.destaque} onChange={(v) => setEditando({ ...editando, destaque: v })} label="Matéria destaque" />
                </div>
                <div className="flex items-end pb-1">
                  <Toggle checked={editando.ativo} onChange={(v) => setEditando({ ...editando, ativo: v })} label={editando.ativo ? "Publicada" : "Rascunho"} />
                </div>
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
