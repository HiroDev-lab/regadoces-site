"use client";

import { useEffect, useRef, useState } from "react";
import type { Categoria } from "@/lib/db";
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
  Gestão de categorias:
  - criar, renomear (os produtos acompanham), ordenar (arrastar ou ▲▼)
  - visível/oculta: categoria oculta some do site inteiro (filtro da
    página de produtos, ícones da Home e os produtos dela)
  - a foto vira o ícone redondo da Home (sem foto = sem ícone, mas a
    categoria continua no filtro)
*/
type Form = Omit<Categoria, "id" | "ordem"> & { id?: string };

const VAZIO: Form = { nome: "", imagem: "", ativo: true };

export default function AdminCategorias() {
  const [lista, setLista] = useState<Categoria[]>([]);
  const [editando, setEditando] = useState<Form | null>(null);
  const [msg, setMsg] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [armado, setArmado] = useState<string | null>(null);
  const [salvandoOrdem, setSalvandoOrdem] = useState(false);
  const listaRef = useRef<Categoria[]>([]);
  listaRef.current = lista;

  async function carregar() {
    const res = await fetch("/api/admin/categories");
    if (res.ok) setLista(await res.json());
  }
  useEffect(() => {
    carregar();
  }, []);

  function moverPara(arrastadoId: string, alvoId: string) {
    setLista((prev) => {
      const de = prev.findIndex((c) => c.id === arrastadoId);
      const para = prev.findIndex((c) => c.id === alvoId);
      if (de === -1 || para === -1 || de === para) return prev;
      const nova = [...prev];
      const [item] = nova.splice(de, 1);
      nova.splice(para, 0, item);
      return nova.map((c, i) => ({ ...c, ordem: i + 1 }));
    });
  }

  async function persistirOrdem(l: Categoria[]) {
    setSalvandoOrdem(true);
    const res = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: l.map((c) => c.id) }),
    });
    setSalvandoOrdem(false);
    if (!res.ok) {
      setMsg("Não consegui salvar a nova ordem — recarregando a lista.");
      carregar();
    }
  }

  function mover(c: Categoria, dir: -1 | 1) {
    const idx = lista.findIndex((x) => x.id === c.id);
    const alvo = lista[idx + dir];
    if (!alvo) return;
    const nova = [...lista];
    const [item] = nova.splice(idx, 1);
    nova.splice(idx + dir, 0, item);
    const renumerada = nova.map((x, i) => ({ ...x, ordem: i + 1 }));
    setLista(renumerada);
    persistirOrdem(renumerada);
  }

  async function salvar() {
    if (!editando) return;
    setMsg("");
    const res = await fetch("/api/admin/categories", {
      method: editando.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editando),
    });
    if (res.ok) {
      setEditando(null);
      carregar();
    } else {
      const data = await res.json().catch(() => null);
      setMsg(data?.erro ?? "Erro ao salvar.");
    }
  }

  async function excluir(c: Categoria) {
    if (!confirm(`Excluir a categoria "${c.nome}"? (Para tirar do site sem excluir, basta ocultar.)`)) return;
    const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(c.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.erro ?? "Não foi possível excluir.");
    }
    carregar();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <H1>Categorias</H1>
        <BtnPrimary onClick={() => setEditando({ ...VAZIO })}>+ Nova categoria</BtnPrimary>
      </div>
      <p className="mt-1 font-sans text-[13px] text-marrom/60">
        A ordem daqui vale para o filtro da página de produtos e para os
        ícones da Home (a foto é o ícone — sem foto, a categoria fica só no
        filtro). Categoria <b>oculta</b> some do site inteiro, junto com os
        produtos dela.
      </p>
      <p className="mt-2 font-sans text-[13px] text-marrom/60">
        💡 Para mudar a ordem, segure na alça <span className="font-bold">⠿</span> e
        arraste (ou use as setas ▲▼).
        {salvandoOrdem && (
          <span className="ml-2 font-semibold text-vinho">salvando ordem…</span>
        )}
      </p>
      {msg && <p className="mt-2 font-sans text-[13px] font-semibold text-vinho">{msg}</p>}

      <div className="mt-5 flex flex-col gap-3">
        {lista.map((c, i) => (
          <div
            key={c.id}
            draggable={armado === c.id}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", c.id);
              setDragId(c.id);
            }}
            onDragEnter={() => {
              if (dragId && dragId !== c.id) moverPara(dragId, c.id);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragEnd={() => {
              setDragId(null);
              setArmado(null);
              persistirOrdem(listaRef.current);
            }}
            className={`transition-opacity ${dragId === c.id ? "opacity-40" : ""}`}
          >
            <Card>
              <div className="flex flex-wrap items-center gap-4">
                <span
                  title="Segure e arraste para reordenar"
                  onMouseDown={() => setArmado(c.id)}
                  onMouseUp={() => setArmado(null)}
                  className="cursor-grab select-none px-1 text-xl leading-none text-marrom/50 active:cursor-grabbing"
                  aria-hidden
                >
                  ⠿
                </span>
                <div className="flex flex-col gap-1">
                  <button onClick={() => mover(c, -1)} disabled={i === 0} className="text-marrom/60 disabled:opacity-20">▲</button>
                  <button onClick={() => mover(c, 1)} disabled={i === lista.length - 1} className="text-marrom/60 disabled:opacity-20">▼</button>
                </div>
                {c.imagem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imagem} alt="" className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-marrom/30 font-sans text-[10px] text-marrom/50">
                    sem ícone
                  </span>
                )}
                <div className="min-w-[140px] flex-1">
                  <p className="truncate font-sans text-[15px] font-semibold text-marrom">
                    {c.ordem}º — {c.nome}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 font-sans text-[12px] font-semibold ${
                    c.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {c.ativo ? "visível no site" : "OCULTA (some do site)"}
                </span>
                <BtnGhost onClick={() => setEditando(c)}>Editar</BtnGhost>
                <BtnGhost onClick={() => excluir(c)} className="!text-red-700">Excluir</BtnGhost>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {editando && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-marrom/50 p-6">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-xl">
            <h2 className="font-sans text-xl font-bold text-marrom">
              {editando.id ? "Editar categoria" : "Nova categoria"}
            </h2>
            <div className="mt-5 flex flex-col gap-4">
              <Field label="Nome da categoria">
                <input
                  className={inputCls}
                  value={editando.nome}
                  onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                />
              </Field>
              {editando.id && (
                <p className="font-sans text-[12px] text-marrom/60">
                  Ao renomear, todos os produtos desta categoria são atualizados
                  automaticamente.
                </p>
              )}
              <Field label="Foto (ícone redondo da Home — opcional)">
                <ImageUpload
                  value={editando.imagem}
                  onChange={(url) => setEditando({ ...editando, imagem: url })}
                />
              </Field>
              <Toggle
                checked={editando.ativo}
                onChange={(v) => setEditando({ ...editando, ativo: v })}
                label={editando.ativo ? "Visível no site" : "Oculta (some do site, com os produtos)"}
              />
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
