"use client";

import { useEffect, useState } from "react";
import type { LojaStatus } from "@/lib/db";
import { BtnPrimary, Card, Field, H1, inputCls } from "@/components/admin/ui";

/*
  Abrir/fechar a loja online (como no iFood). Com a loja fechada o site
  continua no ar e o cliente monta o carrinho, mas o checkout é
  bloqueado. Opcionalmente dá para informar o horário de volta
  ("Volto às 17:00"), mostrado com destaque para o cliente.
*/
export default function AdminLoja() {
  const [loja, setLoja] = useState<LojaStatus | null>(null);
  const [voltaAs, setVoltaAs] = useState("");
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch("/api/admin/loja")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setLoja(d);
          setVoltaAs(d.voltaAs ?? "");
        }
      });
  }, []);

  async function salvar(aberta: boolean) {
    setMsg("");
    setSalvando(true);
    const res = await fetch("/api/admin/loja", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aberta, voltaAs: aberta ? "" : voltaAs }),
    });
    setSalvando(false);
    if (res.ok) {
      const d = await res.json();
      setLoja(d);
      setVoltaAs(d.voltaAs ?? "");
      setMsg(aberta ? "Loja aberta! Os clientes já conseguem finalizar compras." : "Loja fechada. O checkout está bloqueado.");
    } else {
      const data = await res.json().catch(() => null);
      setMsg(data?.erro ?? "Erro ao salvar.");
    }
  }

  return (
    <div>
      <H1>Loja aberta / fechada</H1>
      <p className="mt-1 font-sans text-[13px] text-marrom/60">
        O site fica sempre no ar. Com a loja fechada, o cliente ainda monta o
        carrinho, mas não consegue finalizar a compra — e vê um aviso claro no
        site (com o horário de volta, se você informar).
      </p>

      {!loja ? (
        <p className="mt-8 font-sans text-[14px] text-marrom/60">Carregando…</p>
      ) : (
        <div className="mt-6 max-w-xl">
          <Card>
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className={`inline-block h-4 w-4 rounded-full ${
                  loja.aberta ? "bg-green-600" : "bg-red-600"
                }`}
              />
              <p className="font-sans text-xl font-bold text-marrom">
                {loja.aberta ? "Loja online (aberta)" : "Loja offline (fechada)"}
              </p>
            </div>
            <p className="mt-2 font-sans text-[13px] text-marrom/60">
              {loja.aberta
                ? "Os clientes conseguem finalizar compras normalmente."
                : loja.voltaAs
                  ? `O site avisa que a loja está fechada e que você volta às ${loja.voltaAs}.`
                  : "O site avisa que a loja está fechada no momento."}
            </p>

            {loja.aberta ? (
              <div className="mt-6">
                <Field label="Volto às (opcional — aparece no aviso para o cliente)">
                  <input
                    type="time"
                    className={inputCls + " max-w-[160px]"}
                    value={voltaAs}
                    onChange={(e) => setVoltaAs(e.target.value)}
                  />
                </Field>
                <BtnPrimary
                  className="mt-4 !bg-red-700 hover:!bg-red-800"
                  disabled={salvando}
                  onClick={() => salvar(false)}
                >
                  {salvando ? "Salvando..." : "🔴 Fechar a loja"}
                </BtnPrimary>
              </div>
            ) : (
              <div className="mt-6">
                <Field label="Volto às (opcional — aparece no aviso para o cliente)">
                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      className={inputCls + " max-w-[160px]"}
                      value={voltaAs}
                      onChange={(e) => setVoltaAs(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => salvar(false)}
                      disabled={salvando}
                      className="mt-1 font-sans text-[13px] font-semibold text-vinho underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      Atualizar horário
                    </button>
                  </div>
                </Field>
                <BtnPrimary
                  className="mt-4 !bg-green-700 hover:!bg-green-800"
                  disabled={salvando}
                  onClick={() => salvar(true)}
                >
                  {salvando ? "Salvando..." : "🟢 Abrir a loja agora"}
                </BtnPrimary>
              </div>
            )}

            {msg && (
              <p className="mt-4 font-sans text-[13px] font-semibold text-vinho">
                {msg}
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
