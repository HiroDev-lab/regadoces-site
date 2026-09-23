"use client";

import { useEffect, useState } from "react";
import type { Coupon } from "@/lib/db";
import {
  BtnGhost,
  BtnPrimary,
  Card,
  Field,
  H1,
  Toggle,
  inputCls,
} from "@/components/admin/ui";

type Form = Omit<Coupon, "id" | "usos" | "criadoEm"> & { id?: string };

const VAZIO: Form = {
  codigo: "",
  tipo: "percentual",
  valor: 10,
  validade: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  usoMaximo: 0,
  umPorCpf: true,
  ativo: true,
};

function gerarCodigo() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "REGA-";
  for (let i = 0; i < 5; i++)
    c += letras[Math.floor(Math.random() * letras.length)];
  return c;
}

export default function AdminCupons() {
  const [lista, setLista] = useState<Coupon[]>([]);
  const [editando, setEditando] = useState<Form | null>(null);
  const [msg, setMsg] = useState("");

  async function carregar() {
    const res = await fetch("/api/admin/coupons");
    if (res.ok) setLista(await res.json());
  }
  useEffect(() => {
    carregar();
  }, []);

  async function salvar() {
    if (!editando) return;
    setMsg("");
    const res = await fetch("/api/admin/coupons", {
      method: editando.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editando,
        valor: Number(editando.valor),
        usoMaximo: Number(editando.usoMaximo),
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
    if (!confirm("Excluir este cupom?")) return;
    await fetch(`/api/admin/coupons?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    carregar();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <H1>Cupons</H1>
        <BtnPrimary onClick={() => setEditando({ ...VAZIO, codigo: gerarCodigo() })}>
          + Gerar cupom
        </BtnPrimary>
      </div>
      <p className="mt-1 font-sans text-[13px] text-marrom/60">
        O cliente digita o código no campo &quot;Tick promocional&quot; do carrinho.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {lista.map((c) => (
          <Card key={c.id}>
            <div className="flex flex-wrap items-center gap-4">
              <span className="rounded-md bg-creme px-3 py-1.5 font-mono text-[15px] font-bold tracking-wider text-vinho">
                {c.codigo}
              </span>
              <p className="font-sans text-[14px] text-marrom">
                {c.tipo === "percentual"
                  ? `${c.valor}% de desconto`
                  : `R$ ${c.valor.toFixed(2).replace(".", ",")} de desconto`}
              </p>
              <p className="font-sans text-[13px] text-marrom/60">
                até {c.validade.split("-").reverse().join("/")} ·{" "}
                {c.usoMaximo > 0 ? `${c.usos}/${c.usoMaximo} usos` : `${c.usos} usos (ilimitado)`}
                {c.umPorCpf && " · 1 por CPF"}
              </p>
              <span
                className={`ml-auto rounded-full px-3 py-1 font-sans text-[12px] font-semibold ${
                  c.ativo ? "bg-green-100 text-green-700" : "bg-marrom/10 text-marrom/60"
                }`}
              >
                {c.ativo ? "ativo" : "inativo"}
              </span>
              <BtnGhost onClick={() => setEditando(c)}>Editar</BtnGhost>
              <BtnGhost onClick={() => excluir(c.id)} className="!text-red-700">Excluir</BtnGhost>
            </div>
          </Card>
        ))}
      </div>

      {editando && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-marrom/50 p-6">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-xl">
            <h2 className="font-sans text-xl font-bold text-marrom">
              {editando.id ? "Editar cupom" : "Novo cupom"}
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Código">
                <div className="flex gap-2">
                  <input className={inputCls} value={editando.codigo} onChange={(e) => setEditando({ ...editando, codigo: e.target.value.toUpperCase() })} />
                  <BtnGhost type="button" onClick={() => setEditando({ ...editando, codigo: gerarCodigo() })}>
                    🎲
                  </BtnGhost>
                </div>
              </Field>
              <Field label="Tipo de desconto">
                <select className={inputCls} value={editando.tipo} onChange={(e) => setEditando({ ...editando, tipo: e.target.value as "percentual" | "valor" })}>
                  <option value="percentual">Percentual (%)</option>
                  <option value="valor">Valor fixo (R$)</option>
                </select>
              </Field>
              <Field label={editando.tipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"}>
                <input type="number" min="0" step="0.01" className={inputCls} value={editando.valor} onChange={(e) => setEditando({ ...editando, valor: Number(e.target.value) })} />
              </Field>
              <Field label="Válido até">
                <input type="date" className={inputCls} value={editando.validade} onChange={(e) => setEditando({ ...editando, validade: e.target.value })} />
              </Field>
              <Field label="Limite de usos (0 = ilimitado)">
                <input type="number" min="0" className={inputCls} value={editando.usoMaximo} onChange={(e) => setEditando({ ...editando, usoMaximo: Number(e.target.value) })} />
              </Field>
              <div className="flex items-end pb-1">
                <Toggle checked={editando.ativo} onChange={(v) => setEditando({ ...editando, ativo: v })} label={editando.ativo ? "Cupom ativo" : "Cupom desativado"} />
              </div>
              <div className="sm:col-span-2">
                <Toggle
                  checked={editando.umPorCpf ?? false}
                  onChange={(v) => setEditando({ ...editando, umPorCpf: v })}
                  label="Limitar a 1 uso por CPF (a mesma pessoa não usa duas vezes)"
                />
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
