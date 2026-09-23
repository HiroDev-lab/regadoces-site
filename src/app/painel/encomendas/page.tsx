"use client";

import { useEffect, useRef, useState } from "react";
import type { EncomendaItem, EncomendasTopo } from "@/lib/db";
import { BtnGhost, BtnPrimary, Card, Field, H1, ImageUpload, inputCls } from "@/components/admin/ui";

/*
  Edita os 4 quadrados de "O que você pode encomendar?" (/encomendas):
  foto do card, textos e a galeria de fotos da página do item — número
  LIVRE de fotos, cada uma com legendinha (pedido do Ricardo, 31/08).
  Desde 02/09 também edita o TOPO da página (foto grande, título, texto).
*/

/** Foto grande, título e texto do topo de /encomendas. */
function EditorTopo() {
  const [topo, setTopo] = useState<EncomendasTopo | null>(null);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch("/api/admin/encomendas/topo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setTopo(d); });
  }, []);

  function mudar<K extends keyof EncomendasTopo>(campo: K, valor: EncomendasTopo[K]) {
    setTopo((t) => (t ? { ...t, [campo]: valor } : t));
    setMsg("");
    setErro("");
  }

  async function salvar() {
    if (!topo) return;
    setMsg("");
    setErro("");
    setSalvando(true);
    const res = await fetch("/api/admin/encomendas/topo", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(topo),
    });
    setSalvando(false);
    if (res.ok) {
      setTopo(await res.json());
      setMsg("Salvo! Já está valendo no site.");
    } else {
      const data = await res.json().catch(() => null);
      setErro(data?.erro ?? "Erro ao salvar.");
    }
  }

  return (
    <Card>
      <p className="font-sans text-lg font-bold text-marrom">Topo da página</p>
      <p className="mt-1 font-sans text-[13px] text-marrom/60">
        A foto grande, o título e o texto que aparecem no alto de Encomendas.
        No título, o Enter vira quebra de linha no site (só no computador).
      </p>
      {!topo ? (
        <p className="mt-4 font-sans text-[14px] text-marrom/60">Carregando…</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <Field label="Foto grande do topo">
            <ImageUpload value={topo.foto} onChange={(url) => mudar("foto", url)} />
          </Field>
          <Field label="Título">
            <textarea
              className={inputCls + " min-h-[70px]"}
              value={topo.titulo}
              onChange={(e) => mudar("titulo", e.target.value)}
            />
          </Field>
          <Field label="Texto">
            <textarea
              className={inputCls + " min-h-[110px]"}
              value={topo.texto}
              onChange={(e) => mudar("texto", e.target.value)}
            />
          </Field>
          <div className="flex items-center gap-4">
            <BtnPrimary disabled={salvando} onClick={salvar}>
              {salvando ? "Salvando..." : "Salvar topo"}
            </BtnPrimary>
            {msg && <p className="font-sans text-[13px] font-semibold text-green-700">{msg}</p>}
            {erro && <p className="font-sans text-[13px] font-semibold text-vinho">{erro}</p>}
          </div>
        </div>
      )}
    </Card>
  );
}

function UploadFotoGaleria({ onAdd }: { onAdd: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState("");

  async function upload(file: File) {
    setErro("");
    setSubindo(true);
    const fd = new FormData();
    fd.append("arquivo", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => null);
    setSubindo(false);
    if (res.ok && data?.url) onAdd(data.url);
    else setErro(data?.erro ?? "Falha no upload.");
  }

  return (
    <div className="flex items-center gap-2">
      <BtnGhost type="button" onClick={() => ref.current?.click()} disabled={subindo}>
        {subindo ? "Enviando..." : "+ Adicionar foto"}
      </BtnGhost>
      {erro && <p className="font-sans text-[12px] text-vinho">{erro}</p>}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function EditorItem({ item, onSaved }: { item: EncomendaItem; onSaved: (i: EncomendaItem) => void }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(item.nome);
  const [desc, setDesc] = useState(item.desc);
  const [resumo, setResumo] = useState(item.resumo);
  const [cardFoto, setCardFoto] = useState(item.cardFoto);
  const [fotos, setFotos] = useState(item.fotos);
  const [detalhes, setDetalhes] = useState(item.detalhes.join("\n"));
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  function moverFoto(i: number, delta: number) {
    setFotos((fs) => {
      const j = i + delta;
      if (j < 0 || j >= fs.length) return fs;
      const novo = [...fs];
      [novo[i], novo[j]] = [novo[j], novo[i]];
      return novo;
    });
    setMsg("");
  }

  async function salvar() {
    setMsg("");
    setSalvando(true);
    const res = await fetch("/api/admin/encomendas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        nome,
        desc,
        resumo,
        cardFoto,
        fotos,
        detalhes: detalhes
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
      }),
    });
    setSalvando(false);
    if (res.ok) {
      const d = await res.json();
      onSaved(d);
      setMsg("Salvo! Já está valendo no site.");
    } else {
      const data = await res.json().catch(() => null);
      setMsg(data?.erro ?? "Erro ao salvar.");
    }
  }

  return (
    <Card>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-sans text-lg font-bold text-marrom">{item.nome}</span>
        <span className="font-sans text-[13px] font-semibold text-vinho">
          {aberto ? "Fechar ▲" : "Editar ▼"}
        </span>
      </button>

      {aberto && (
        <div className="mt-5 flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome">
              <input className={inputCls} value={nome} onChange={(e) => { setNome(e.target.value); setMsg(""); }} />
            </Field>
            <Field label="Frase do card (página Encomendas)">
              <input className={inputCls} value={desc} onChange={(e) => { setDesc(e.target.value); setMsg(""); }} />
            </Field>
          </div>

          <Field label="Foto do card (o quadrado em 'O que você pode encomendar?')">
            <ImageUpload value={cardFoto} onChange={(url) => { setCardFoto(url); setMsg(""); }} />
          </Field>

          <Field label="Frase de abertura da página do item">
            <input className={inputCls} value={resumo} onChange={(e) => { setResumo(e.target.value); setMsg(""); }} />
          </Field>

          <div>
            <p className="font-sans text-[12px] font-bold uppercase tracking-wide text-marrom/60">
              Fotos da página (quantas quiser, com legendinha)
            </p>
            <div className="mt-2 flex flex-col gap-3">
              {fotos.map((f, i) => (
                <div key={`${f.url}-${i}`} className="flex flex-wrap items-center gap-3 rounded-lg border border-marrom/10 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="" className="h-14 w-14 rounded-md object-cover" />
                  <input
                    className={inputCls + " min-w-[160px] flex-1"}
                    placeholder="Legendinha da foto (opcional)"
                    value={f.legenda}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFotos((fs) => fs.map((x, j) => (j === i ? { ...x, legenda: v } : x)));
                      setMsg("");
                    }}
                  />
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label="Subir foto" onClick={() => moverFoto(i, -1)} disabled={i === 0} className="px-1 text-marrom/60 hover:text-marrom disabled:opacity-25">▲</button>
                    <button type="button" aria-label="Descer foto" onClick={() => moverFoto(i, 1)} disabled={i === fotos.length - 1} className="px-1 text-marrom/60 hover:text-marrom disabled:opacity-25">▼</button>
                    <button
                      type="button"
                      aria-label="Remover foto"
                      onClick={() => { setFotos((fs) => fs.filter((_, j) => j !== i)); setMsg(""); }}
                      className="px-1 text-lg leading-none text-vinho/70 hover:text-vinho"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <UploadFotoGaleria onAdd={(url) => { setFotos((fs) => [...fs, { url, legenda: "" }]); setMsg(""); }} />
            </div>
          </div>

          <Field label='Textinho do quadro "Como funciona" (uma linha por item)'>
            <textarea
              className={inputCls + " min-h-[140px]"}
              value={detalhes}
              onChange={(e) => { setDetalhes(e.target.value); setMsg(""); }}
            />
          </Field>

          <div className="flex items-center gap-4">
            <BtnPrimary disabled={salvando} onClick={salvar}>
              {salvando ? "Salvando..." : "Salvar"}
            </BtnPrimary>
            {msg && <p className="font-sans text-[13px] font-semibold text-vinho">{msg}</p>}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function AdminEncomendas() {
  const [itens, setItens] = useState<EncomendaItem[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/encomendas")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setItens(d); });
  }, []);

  return (
    <div>
      <H1>Encomendas</H1>
      <p className="mt-1 font-sans text-[13px] text-marrom/60">
        O topo da página e os 4 quadrados de &quot;O que você pode encomendar?&quot;.
        Em cada quadrado você troca a foto do card, os textos e as fotos da
        página do item — pode colocar quantas fotos quiser, cada uma com a
        sua legendinha.
      </p>

      <div className="mt-6 max-w-3xl">
        <EditorTopo />
      </div>

      <p className="mt-8 font-sans text-lg font-bold text-marrom">Os 4 quadrados</p>

      {!itens ? (
        <p className="mt-8 font-sans text-[14px] text-marrom/60">Carregando…</p>
      ) : (
        <div className="mt-3 flex max-w-3xl flex-col gap-4">
          {itens.map((it) => (
            <EditorItem
              key={it.id}
              item={it}
              onSaved={(novo) => setItens((ls) => ls!.map((x) => (x.id === novo.id ? novo : x)))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
