"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import TicketButton from "./TicketButton";
import { useCart } from "./CartContext";
import { useLojaStatus } from "./SiteNav";

/*
  Card "Resumo do Pedido" (coluna direita das LPs de checkout).
  - No passo 1 mostra cálculo de frete + cupom ("Tick promocional").
  - Nos passos 2 e 3 mostra também os itens em miniatura.
  Frete e cupom ficam salvos em sessionStorage para os passos seguintes.
*/

export type ResumoState = {
  cep: string;
  frete: number | null;
  /** ex.: "aprox. 22 min (5 km)" — vem do /api/frete */
  prazo?: string;
  cupom: string;
  desconto: number;
};

const RESUMO_KEY = "regadoces_resumo_v1";

export function loadResumo(): ResumoState {
  try {
    const raw = sessionStorage.getItem(RESUMO_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { cep: "", frete: null, cupom: "", desconto: 0 };
}

function saveResumo(r: ResumoState) {
  try {
    sessionStorage.setItem(RESUMO_KEY, JSON.stringify(r));
  } catch {}
}

export function formatBRL(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

export default function CartSummary({
  passo,
  ctaLabel,
  ctaHref,
  onCta,
  ctaDisabled = false,
  mostrarItens = false,
  mostrarSelos = false,
}: {
  passo: 1 | 2 | 3;
  ctaLabel: string;
  ctaHref?: string;
  onCta?: () => void;
  ctaDisabled?: boolean;
  mostrarItens?: boolean;
  mostrarSelos?: boolean;
}) {
  const { itens, subtotal } = useCart();
  // loja fechada (painel do Ricardo) = dá para montar o carrinho,
  // mas não seguir para o checkout; a rota /api/checkout também trava
  const loja = useLojaStatus();
  const lojaFechada = loja !== null && !loja.aberta;
  const [resumo, setResumo] = useState<ResumoState>({
    cep: "",
    frete: null,
    cupom: "",
    desconto: 0,
  });
  const [msg, setMsg] = useState("");
  // nos passos 2/3, se o cliente escolheu retirada o frete é grátis
  const [retirada, setRetirada] = useState(false);

  useEffect(() => {
    const r = loadResumo();
    setResumo(r);
    if (passo > 1) {
      try {
        const ident = JSON.parse(
          sessionStorage.getItem("regadoces_identificacao_v1") ?? "null"
        );
        if (ident?.tipo === "retirada") {
          setRetirada(true);
        } else if (ident?.cep && r.frete === null) {
          // entrega sem cotação feita no carrinho: cota agora pelo CEP da entrega
          fetch("/api/frete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cep: String(ident.cep).replace(/\D/g, "") }),
          })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.valor != null) {
                setResumo((prev) => {
                  const next = { ...prev, frete: data.valor, prazo: data.prazo };
                  saveResumo(next);
                  return next;
                });
              }
            })
            .catch(() => {});
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(r: Partial<ResumoState>) {
    setResumo((prev) => {
      const next = { ...prev, ...r };
      saveResumo(next);
      return next;
    });
  }

  async function calcularFrete(e?: FormEvent) {
    e?.preventDefault();
    setMsg("");
    const cep = resumo.cep.replace(/\D/g, "");
    if (cep.length !== 8) {
      setMsg("Informe um CEP válido (00000-000).");
      return;
    }
    const res = await fetch("/api/frete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cep }),
    });
    const data = await res.json();
    if (res.ok) {
      update({ frete: data.valor, prazo: data.prazo });
    } else {
      update({ frete: null, prazo: undefined });
      setMsg(data.erro ?? "Não foi possível calcular o frete.");
    }
  }

  async function aplicarCupom(codigo: string) {
    if (!codigo) {
      update({ cupom: "", desconto: 0 });
      return;
    }
    const res = await fetch("/api/cupom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo, subtotal }),
    });
    const data = await res.json();
    if (res.ok) {
      update({ cupom: codigo.toUpperCase(), desconto: data.desconto });
      setMsg(`Cupom ${codigo.toUpperCase()} aplicado!`);
    } else {
      update({ desconto: 0 });
      setMsg(data.erro ?? "Cupom inválido.");
    }
  }

  // retirada = grátis; sem cotação ainda = mostra aviso e soma 0
  const frete = retirada ? 0 : resumo.frete;
  const total = Math.max(0, subtotal + (frete ?? 0) - resumo.desconto);

  return (
    <aside className="h-fit w-full rounded-[26px] border border-vinho/70 bg-branco-quente px-[max(24px,1.8vw)] py-[max(28px,2vw)]">
      <h2 className="font-sans text-[clamp(26px,2vw,38px)] text-marrom">
        Resumo do Pedido
      </h2>

      {mostrarItens && itens.length > 0 && (
        <div className="mt-5 flex flex-col gap-3">
          {itens.map((i) => (
            <div
              key={i.produtoId}
              className="flex items-center gap-3 rounded-xl border border-vinho/40 bg-white p-2"
            >
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg">
                <Image src={i.imagem} alt={i.nome} fill sizes="80px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-[15px] font-medium text-marrom">
                  {i.nome}
                </p>
                <p className="font-sans text-[12px] text-marrom/60">{i.detalhe}</p>
                <p className="font-sans text-[12px] text-marrom/60">
                  Quantidade: {i.quantidade}
                </p>
              </div>
              <p className="pr-2 font-sans text-[14px] font-semibold text-marrom">
                {formatBRL(i.preco)}
              </p>
            </div>
          ))}
        </div>
      )}

      {passo === 1 && (
        <>
          <p className="mt-4 font-sans text-[clamp(16px,1.05vw,20px)] text-vinho">Cálculo de frete</p>
          <form onSubmit={calcularFrete} className="mt-2 flex gap-2">
            <input
              value={resumo.cep}
              onChange={(e) => update({ cep: e.target.value })}
              placeholder="00000-000"
              inputMode="numeric"
              maxLength={9}
              className="w-full rounded-sm bg-cinza-card/70 px-4 py-[max(12px,0.7vw)] font-sans text-[clamp(15px,0.95vw,18px)] text-marrom placeholder-marrom/50 outline-none"
            />
            <button
              type="submit"
              className="rounded-sm bg-creme px-5 font-sans text-[clamp(15px,0.95vw,18px)] text-marrom hover:brightness-95"
            >
              ok
            </button>
          </form>
          <input
            defaultValue={resumo.cupom}
            onBlur={(e) => aplicarCupom(e.target.value.trim())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                aplicarCupom((e.target as HTMLInputElement).value.trim());
              }
            }}
            placeholder="Tick promocional"
            className="mt-3 w-full rounded-sm bg-cinza-card/70 px-4 py-[max(12px,0.7vw)] font-sans text-[clamp(15px,0.95vw,18px)] text-marrom placeholder-marrom/50 outline-none"
          />
          {msg && <p className="mt-2 font-sans text-[13px] text-vinho">{msg}</p>}
        </>
      )}

      <div className="mt-6 border-t border-marrom/20 pt-5">
        <div className="flex justify-between font-sans text-[clamp(16px,1.05vw,20px)] text-marrom">
          <span>Subtotal</span>
          <span className="font-bold">{formatBRL(subtotal)}</span>
        </div>
        <div className="mt-2 flex justify-between font-sans text-[clamp(16px,1.05vw,20px)] text-marrom">
          <span>Frete</span>
          {retirada ? (
            <span className="font-bold text-green-700">Grátis (retirada)</span>
          ) : frete === null ? (
            <span className="text-[0.8em] text-marrom/60">
              {passo === 1 ? "informe o CEP acima" : "calculando…"}
            </span>
          ) : (
            <span className="font-bold">{formatBRL(frete)}</span>
          )}
        </div>
        {!retirada && frete !== null && resumo.prazo && (
          <p className="mt-1 text-right font-sans text-[13px] text-marrom/60">
            🛵 entrega {resumo.prazo}
          </p>
        )}
        {resumo.desconto > 0 && (
          <div className="mt-2 flex justify-between font-sans text-[clamp(16px,1.05vw,20px)] text-vinho">
            <span>Desconto ({resumo.cupom})</span>
            <span className="font-bold">- {formatBRL(resumo.desconto)}</span>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-marrom/20 pt-5">
        <span className="font-sans text-[clamp(26px,2.1vw,41px)] font-bold text-marrom">Total</span>
        <span className="font-sans text-[clamp(26px,2.1vw,41px)] font-bold text-marrom">
          {formatBRL(total)}
        </span>
      </div>

      <div className="mt-6 text-center">
        {lojaFechada && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-left">
            <p className="font-sans text-[14px] font-bold text-red-700">
              🔴 A loja está fechada no momento
              {loja?.voltaAs ? ` — voltamos às ${loja.voltaAs}` : ""}.
            </p>
            <p className="mt-1 font-sans text-[13px] text-red-700/80">
              Você pode montar seu carrinho normalmente e finalizar a compra
              assim que a loja reabrir.
            </p>
          </div>
        )}
        <TicketButton
          href={ctaDisabled || lojaFechada ? undefined : ctaHref}
          onClick={ctaDisabled || lojaFechada ? undefined : onCta}
          disabled={ctaDisabled || lojaFechada}
          className="w-full"
          textClassName="text-[clamp(14px,0.95vw,18px)]"
        >
          {ctaLabel}
        </TicketButton>
        <Link
          href="/produtos"
          className="mt-4 inline-block font-sans text-[clamp(13px,0.85vw,16px)] font-semibold tracking-wide text-marrom hover:underline"
        >
          ← CONTINUAR A COMPRAR
        </Link>

        {mostrarSelos && (
          <div className="mt-4 flex justify-center border-t border-marrom/10 pt-4">
            <Image
              src="/images/brand/selos-compra-segura.png"
              alt="Compra 100% segura — VISA, Mastercard, American Express, Diners Club, Boleto, Hipercard, Elo e Mercado Pago"
              width={370}
              height={65}
              className="h-auto w-full max-w-[370px] rounded-md bg-white p-1"
            />
          </div>
        )}
      </div>
    </aside>
  );
}
