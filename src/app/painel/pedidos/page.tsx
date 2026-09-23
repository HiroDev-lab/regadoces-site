"use client";

import { useEffect, useMemo, useState } from "react";
import type { Order } from "@/lib/db";
import { Card, H1 } from "@/components/admin/ui";

const STATUS: Order["status"][] = ["recebido", "preparando", "entregue", "cancelado"];

const moeda = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

/* Planilha CSV (abre direto no Excel/Google Planilhas — separador ; e
   BOM para os acentos saírem certos no Excel) */
function baixarPlanilha(pedidos: Order[], filtro: string) {
  const cab = [
    "Pedido", "Data", "Status", "Nome", "Sobrenome", "E-mail", "Telefone",
    "Entrega/Retirada", "Endereço", "Bairro", "Cidade", "UF", "CEP",
    "Itens", "Subtotal", "Frete", "Desconto", "Cupom", "Total",
    "Pagamento", "Cartão (bandeira/final)", "Status pagamento",
  ];
  const linhas = pedidos.map((o) => [
    o.id,
    new Date(o.criadoEm).toLocaleString("pt-BR"),
    o.status,
    o.cliente.nome,
    o.cliente.sobrenome,
    o.cliente.email,
    o.cliente.telefone,
    o.entrega.tipo === "entrega" ? "Entrega" : "Retirada",
    o.entrega.tipo === "entrega"
      ? `${o.entrega.endereco}, ${o.entrega.numero}${o.entrega.complemento ? ` - ${o.entrega.complemento}` : ""}`
      : "",
    o.entrega.bairro,
    o.entrega.cidade,
    o.entrega.estado,
    o.entrega.cep,
    o.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(" | "),
    o.subtotal.toFixed(2).replace(".", ","),
    o.frete.toFixed(2).replace(".", ","),
    o.desconto.toFixed(2).replace(".", ","),
    o.cupom ?? "",
    o.total.toFixed(2).replace(".", ","),
    o.pagamento.metodo === "pix"
      ? "Pix"
      : o.pagamento.tipoCartao === "debito"
        ? "Cartão de débito"
        : "Cartão de crédito",
    o.pagamento.cartaoFinal ? `${o.pagamento.cartaoBandeira ?? ""} final ${o.pagamento.cartaoFinal}`.trim() : "",
    o.pagamento.status,
  ]);
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const csv =
    "﻿" + [cab, ...linhas].map((l) => l.map(esc).join(";")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const hoje = new Date().toISOString().slice(0, 10);
  a.download = `pedidos-regadoces-${filtro === "todos" ? "todos" : filtro}-${hoje}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function AdminPedidos() {
  const [lista, setLista] = useState<Order[]>([]);
  const [filtro, setFiltro] = useState<"todos" | Order["status"]>("todos");

  async function carregar() {
    const res = await fetch("/api/admin/orders");
    if (res.ok) setLista(await res.json());
  }
  useEffect(() => {
    carregar();
  }, []);

  async function mudarStatus(id: string, status: Order["status"]) {
    await fetch("/api/admin/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    carregar();
  }

  const filtrados = useMemo(
    () => (filtro === "todos" ? lista : lista.filter((o) => o.status === filtro)),
    [lista, filtro]
  );
  const contagem = (s: Order["status"]) => lista.filter((o) => o.status === s).length;

  return (
    <div>
      <H1>Pedidos</H1>
      <p className="mt-1 font-sans text-[13px] text-marrom/60">
        Pedidos criados pelo checkout do site. Pix e cartão (crédito/débito) são confirmados automaticamente pelo C6 Bank (status aprovado = pago).
      </p>

      {/* filtro por status + exportar */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(["todos", ...STATUS] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFiltro(s)}
            className={`rounded-full px-4 py-1.5 font-sans text-[13px] font-semibold transition-colors ${
              filtro === s
                ? "bg-vinho text-creme"
                : "border border-marrom/25 bg-white text-marrom hover:bg-marrom/5"
            }`}
          >
            {s === "todos" ? `todos (${lista.length})` : `${s} (${contagem(s)})`}
          </button>
        ))}
        <button
          onClick={() => baixarPlanilha(filtrados, filtro)}
          disabled={filtrados.length === 0}
          className="ml-auto rounded-full bg-marrom px-4 py-1.5 font-sans text-[13px] font-semibold text-creme transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          ⬇️ Exportar planilha ({filtrados.length})
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {filtrados.length === 0 && (
          <p className="font-sans text-[14px] text-marrom/50">
            {lista.length === 0 ? "Nenhum pedido ainda." : "Nenhum pedido com esse status."}
          </p>
        )}
        {filtrados.map((o) => (
          <Card key={o.id}>
            <div className="flex flex-wrap items-start gap-5">
              <div className="min-w-0 flex-1">
                <p className="font-sans text-[15px] font-semibold text-marrom">
                  {o.cliente.nome} {o.cliente.sobrenome}
                  <span className="ml-2 font-normal text-marrom/50">{o.id}</span>
                </p>
                <p className="mt-0.5 font-sans text-[13px] text-marrom/60">
                  {new Date(o.criadoEm).toLocaleString("pt-BR")} ·{" "}
                  {o.entrega.tipo === "entrega"
                    ? `${o.entrega.endereco}, ${o.entrega.numero} - ${o.entrega.bairro}, ${o.entrega.cidade}/${o.entrega.estado}`
                    : "Retirada no local"}{" "}
                  ·{" "}
                  {o.pagamento.metodo === "pix"
                    ? "Pix"
                    : o.pagamento.tipoCartao === "debito"
                      ? "Cartão de débito"
                      : "Cartão de crédito"}
                  {o.pagamento.cartaoFinal ? ` final ${o.pagamento.cartaoFinal}` : ""} ({o.pagamento.status})
                </p>
                <p className="mt-0.5 font-sans text-[13px] text-marrom/60">
                  ✉️ {o.cliente.email} · 📞 {o.cliente.telefone}
                </p>
                <ul className="mt-2 font-sans text-[13px] text-marrom/80">
                  {o.itens.map((i) => (
                    <li key={i.produtoId}>
                      {i.quantidade}x {i.nome} — {moeda(i.preco * i.quantidade)}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 font-sans text-[13px] text-marrom/80">
                  Frete:{" "}
                  {o.entrega.tipo === "retirada"
                    ? "grátis (retirada)"
                    : moeda(o.frete)}
                  {o.desconto > 0 && (
                    <span className="ml-2">· Desconto: -{moeda(o.desconto)}</span>
                  )}
                </p>
                <p className="mt-1 font-sans text-[14px] font-bold text-marrom">
                  Total: {moeda(o.total)}
                  {o.cupom && (
                    <span className="ml-2 font-normal text-vinho">cupom {o.cupom}</span>
                  )}
                </p>
              </div>
              <select
                value={o.status}
                onChange={(e) => mudarStatus(o.id, e.target.value as Order["status"])}
                className="rounded-md border border-marrom/20 bg-white px-3 py-2 font-sans text-[13px] font-semibold text-marrom"
              >
                {STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
