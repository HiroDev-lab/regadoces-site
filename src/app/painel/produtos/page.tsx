"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/db";
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
  Gestão de produtos:
  - nome, foto, descrição, preço, categoria, ORDEM na fila, ESTOQUE, ativo
  - estoque 0 → o produto continua aqui, mas some do site do cliente
*/

/* fallback enquanto as categorias do painel não carregam */
const CATEGORIAS_FALLBACK = [
  "Torta", "Bolo", "Brownie", "Brigadeiro", "Brigadeirão", "Pudim/Sorvete",
  "Pavê", "Mousse", "Cocada", "Encomendas", "Páscoa", "Bebidas", "Extras",
];

const VAZIO: Omit<Product, "id"> = {
  codigo: "",
  nome: "",
  descricao: "",
  detalhe: "",
  preco: 0,
  precoPromocional: null,
  categoria: "Bolo",
  imagem: "",
  ordem: 1,
  estoque: 0,
  ativo: true,
};

export default function AdminProdutos() {
  const [lista, setLista] = useState<Product[]>([]);
  const [editando, setEditando] = useState<Product | (Omit<Product, "id"> & { id?: string }) | null>(null);
  const [msg, setMsg] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroCat, setFiltroCat] = useState("Todas");
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_FALLBACK);

  /* --- arrastar e soltar para reordenar --- */
  const [dragId, setDragId] = useState<string | null>(null); // sendo arrastado
  const [armado, setArmado] = useState<string | null>(null); // mouse na alça ⠿
  const [salvandoOrdem, setSalvandoOrdem] = useState(false);
  const listaRef = useRef<Product[]>([]);
  listaRef.current = lista;

  async function carregar() {
    const res = await fetch("/api/admin/products");
    if (res.ok) setLista(await res.json());
  }
  useEffect(() => {
    carregar();
    // categorias cadastradas no painel (menu Categorias)
    fetch("/api/admin/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((cats: { nome: string }[] | null) => {
        if (cats?.length) setCategorias(cats.map((c) => c.nome));
      })
      .catch(() => {});
  }, []);

  /** Move o item arrastado para a posição do item alvo (prévia ao vivo). */
  function moverPara(arrastadoId: string, alvoId: string) {
    setLista((prev) => {
      const de = prev.findIndex((p) => p.id === arrastadoId);
      const para = prev.findIndex((p) => p.id === alvoId);
      if (de === -1 || para === -1 || de === para) return prev;
      const nova = [...prev];
      const [item] = nova.splice(de, 1);
      nova.splice(para, 0, item);
      return nova.map((p, i) => ({ ...p, ordem: i + 1 }));
    });
  }

  /* --- celular: arrastar pela alça com o dedo (eventos de toque) ---
     O drag-and-drop nativo (draggable/onDragStart) NÃO dispara em tela de
     toque, então a alça também escuta touchstart/move/end. `touch-none`
     na alça impede a página de rolar enquanto se arrasta. */
  function tocarInicio(id: string) {
    setArmado(id);
    setDragId(id);
  }
  function tocarMover(e: React.TouchEvent) {
    const atual = dragId;
    if (!atual) return;
    const t = e.touches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY);
    const card = el?.closest<HTMLElement>("[data-produto-id]");
    const alvo = card?.dataset.produtoId;
    if (alvo && alvo !== atual) moverPara(atual, alvo);
  }
  function tocarFim() {
    if (!dragId) return;
    setDragId(null);
    setArmado(null);
    persistirOrdem(listaRef.current);
  }

  /** Grava a ordem atual (1, 2, 3…) no servidor de uma vez só. */
  async function persistirOrdem(l: Product[]) {
    setSalvandoOrdem(true);
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: l.map((p) => p.id) }),
    });
    setSalvandoOrdem(false);
    if (!res.ok) {
      setMsg("Não consegui salvar a nova ordem — recarregando a lista.");
      carregar();
    }
  }

  async function salvar() {
    if (!editando) return;
    setMsg("");
    const metodo = editando.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/products", {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editando,
        preco: Number(editando.preco),
        precoPromocional: editando.precoPromocional
          ? Number(editando.precoPromocional)
          : null,
        ordem: Number(editando.ordem),
        estoque: Number(editando.estoque),
      }),
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
    if (!confirm("Excluir este produto? (Para tirar do ar sem excluir, basta desativar.)")) return;
    await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    carregar();
  }

  /** Botões ▲▼: sobe/desce uma posição (mesma gravação do arrastar). */
  function mover(p: Product, dir: -1 | 1) {
    const idx = lista.findIndex((x) => x.id === p.id);
    const alvo = lista[idx + dir];
    if (!alvo) return;
    const nova = [...lista];
    const [item] = nova.splice(idx, 1);
    nova.splice(idx + dir, 0, item);
    const renumerada = nova.map((x, i) => ({ ...x, ordem: i + 1 }));
    setLista(renumerada);
    persistirOrdem(renumerada);
  }

  const termo = busca.trim().toLowerCase();
  const visiveis = lista.filter(
    (p) =>
      (filtroCat === "Todas" || p.categoria === filtroCat) &&
      (!termo || p.nome.toLowerCase().includes(termo) || p.codigo.toLowerCase().includes(termo))
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <H1>Produtos</H1>
        <BtnPrimary onClick={() => setEditando({ ...VAZIO, ordem: lista.length + 1 })}>
          + Novo produto
        </BtnPrimary>
      </div>
      <p className="mt-1 font-sans text-[13px] text-marrom/60">
        Quando o estoque chega a zero o produto continua listado aqui, mas
        deixa de aparecer para os clientes no site.
      </p>

      {/* busca + filtro por categoria (com 100+ produtos fica fácil achar) */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          className={inputCls + " max-w-sm"}
          placeholder="Buscar por nome ou código…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select className={inputCls + " w-auto"} value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)}>
          <option value="Todas">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="font-sans text-[13px] text-marrom/60">{visiveis.length} de {lista.length} produtos</span>
        {salvandoOrdem && (
          <span className="font-sans text-[13px] font-semibold text-vinho">salvando ordem…</span>
        )}
      </div>
      <p className="mt-2 font-sans text-[13px] text-marrom/60">
        💡 Para mudar a ordem, segure na alça <span className="font-bold">⠿</span> e
        arraste o produto até a posição desejada (ou use as setas ▲▼).
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {visiveis.map((p) => {
          const i = lista.indexOf(p);
          return (
          <div
            key={p.id}
            data-produto-id={p.id}
            draggable={armado === p.id}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", p.id);
              setDragId(p.id);
            }}
            onDragEnter={() => {
              if (dragId && dragId !== p.id) moverPara(dragId, p.id);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragEnd={() => {
              setDragId(null);
              setArmado(null);
              persistirOrdem(listaRef.current);
            }}
            className={`transition-opacity ${dragId === p.id ? "opacity-40" : ""}`}
          >
          <Card>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <span
                title="Segure e arraste para reordenar"
                onMouseDown={() => setArmado(p.id)}
                onMouseUp={() => setArmado(null)}
                onTouchStart={() => tocarInicio(p.id)}
                onTouchMove={tocarMover}
                onTouchEnd={tocarFim}
                onTouchCancel={tocarFim}
                className="cursor-grab touch-none select-none px-2 py-2 text-xl leading-none text-marrom/50 active:cursor-grabbing"
                aria-hidden
              >
                ⠿
              </span>
              <div className="flex flex-col gap-1">
                <button onClick={() => mover(p, -1)} disabled={i === 0} className="text-marrom/60 disabled:opacity-20">▲</button>
                <button onClick={() => mover(p, 1)} disabled={i === lista.length - 1} className="text-marrom/60 disabled:opacity-20">▼</button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imagem || "/images/brand/logo-blob.png"} alt="" className="h-12 w-12 rounded-md object-cover sm:h-14 sm:w-14" />
              {/* largura mínima: no celular os selos/botões descem p/ a linha de baixo */}
              <div className="min-w-[180px] flex-1">
                <p className="truncate font-sans text-[15px] font-semibold text-marrom">
                  {p.ordem}º — {p.nome}
                </p>
                <p className="font-sans text-[13px] text-marrom/60">
                  {p.categoria} ·{" "}
                  {p.precoPromocional && p.precoPromocional > 0 && p.precoPromocional < p.preco ? (
                    <>
                      <span className="line-through">R$ {p.preco.toFixed(2).replace(".", ",")}</span>{" "}
                      <span className="font-bold text-vinho">
                        R$ {p.precoPromocional.toFixed(2).replace(".", ",")} 🏷️ PROMOÇÃO
                      </span>
                    </>
                  ) : (
                    <>R$ {p.preco.toFixed(2).replace(".", ",")}</>
                  )}{" "}
                  · código {p.codigo || "—"}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 font-sans text-[12px] font-semibold ${
                  p.estoque === 0
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {p.estoque === 0 ? "SEM ESTOQUE (oculto no site)" : `estoque: ${p.estoque}`}
              </span>
              <span
                className={`rounded-full px-3 py-1 font-sans text-[12px] font-semibold ${
                  p.ativo ? "bg-azul-btn text-marrom" : "bg-marrom/10 text-marrom/60"
                }`}
              >
                {p.ativo ? "ativo" : "inativo"}
              </span>
              <BtnGhost onClick={() => setEditando(p)}>Editar</BtnGhost>
              <BtnGhost onClick={() => excluir(p.id)} className="!text-red-700">
                Excluir
              </BtnGhost>
            </div>
          </Card>
          </div>
          );
        })}
      </div>

      {editando && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-marrom/50 p-6">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-7 shadow-xl">
            <h2 className="font-sans text-xl font-bold text-marrom">
              {editando.id ? "Editar produto" : "Novo produto"}
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nome do produto">
                <input className={inputCls} value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
              </Field>
              <Field label="Código">
                <input className={inputCls} value={editando.codigo} onChange={(e) => setEditando({ ...editando, codigo: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Descrição">
                  <textarea rows={3} className={inputCls} value={editando.descricao} onChange={(e) => setEditando({ ...editando, descricao: e.target.value })} />
                </Field>
              </div>
              <Field label="Detalhe (ex.: Fatia individual)">
                <input className={inputCls} value={editando.detalhe} onChange={(e) => setEditando({ ...editando, detalhe: e.target.value })} />
              </Field>
              <Field label="Categoria">
                <select className={inputCls} value={editando.categoria} onChange={(e) => setEditando({ ...editando, categoria: e.target.value })}>
                  {categorias.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Preço (R$)">
                <input type="number" step="0.01" min="0" className={inputCls} value={editando.preco} onChange={(e) => setEditando({ ...editando, preco: Number(e.target.value) })} />
              </Field>
              <Field label="Preço promocional (R$) — vazio ou 0 = sem promoção">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputCls}
                  placeholder="ex.: 15,00"
                  value={editando.precoPromocional ?? ""}
                  onChange={(e) =>
                    setEditando({
                      ...editando,
                      precoPromocional: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <div className="sm:col-span-2 -mt-2">
                <p className="font-sans text-[12px] text-marrom/60">
                  Com promoção, o site mostra o preço normal riscado e o
                  promocional embaixo. A promoção só vale se for <b>menor</b> que
                  o preço normal.
                </p>
              </div>
              <Field label="Ordem na fila (1 = primeiro)">
                <input type="number" min="1" className={inputCls} value={editando.ordem} onChange={(e) => setEditando({ ...editando, ordem: Number(e.target.value) })} />
              </Field>
              <Field label="Quantidade em estoque">
                <input type="number" min="0" className={inputCls} value={editando.estoque} onChange={(e) => setEditando({ ...editando, estoque: Number(e.target.value) })} />
              </Field>
              <div className="flex items-end pb-1">
                <Toggle
                  checked={editando.ativo}
                  onChange={(v) => setEditando({ ...editando, ativo: v })}
                  label={editando.ativo ? "Produto ativo" : "Produto desativado"}
                />
              </div>
              <div className="sm:col-span-2">
                <Field label="Foto do produto">
                  <ImageUpload value={editando.imagem} onChange={(url) => setEditando({ ...editando, imagem: url })} />
                </Field>
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
