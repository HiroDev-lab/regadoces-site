"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CartSummary, { loadResumo } from "@/components/CartSummary";
import CheckoutShell from "@/components/CheckoutShell";
import { useCart } from "@/components/CartContext";

/*
  Passo 3 — Pagamento (LP 03).
  Cartão de crédito/débito: o site NÃO pede os dados do cartão. Ao
  finalizar, a rota de checkout cria um link de pagamento no C6 Bank
  (API de Checkout) e o cliente é levado para a página segura do banco,
  onde digita o cartão. Depois de pagar, volta para a página do pedido.
  Pix: QR code / copia e cola na página do pedido.
*/
/*
  Cartão só aparece quando o servidor diz que está ligado (/api/loja → cartao),
  ou seja, depois da homologação da API de Checkout do C6
  (NEXT_PUBLIC_PAGAMENTO_CARTAO=1 no servidor). Até lá, só Pix.
*/
type Metodo = "credito" | "debito" | "pix";

const OPCOES: { valor: Metodo; titulo: string; icone: "cartao" | "pix" }[] = [
  { valor: "credito", titulo: "Cartão de crédito", icone: "cartao" },
  { valor: "debito", titulo: "Cartão de débito", icone: "cartao" },
  { valor: "pix", titulo: "Pix", icone: "pix" },
];

export default function PagamentoPage() {
  const router = useRouter();
  const { itens, clear } = useCart();
  const [cartaoAtivo, setCartaoAtivo] = useState<boolean | null>(null);
  const [metodo, setMetodo] = useState<Metodo>("pix");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    fetch("/api/loja", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ativo) return;
        const liga = Boolean(d?.cartao);
        setCartaoAtivo(liga);
        if (liga) setMetodo("credito");
      })
      .catch(() => {
        if (ativo) setCartaoAtivo(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const CARTAO_ATIVO = cartaoAtivo === true;
  const opcoes = OPCOES.filter((o) => o.valor === "pix" || CARTAO_ATIVO);

  async function finalizar() {
    setErro("");
    if (itens.length === 0) return;

    let identificacao = null;
    try {
      identificacao = JSON.parse(
        sessionStorage.getItem("regadoces_identificacao_v1") ?? "null"
      );
    } catch {}
    if (!identificacao?.nome) {
      setErro("Complete a etapa de identificação antes de pagar.");
      return;
    }

    setEnviando(true);
    const resumo = loadResumo();
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itens: itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
        identificacao,
        cupom: resumo.cupom || null,
        cep: resumo.cep,
        metodo: metodo === "pix" ? "pix" : "cartao",
        tipoCartao: metodo === "pix" ? undefined : metodo,
      }),
    });
    const data = await res.json().catch(() => null);

    if (res.ok && data?.pedidoId) {
      clear();
      try {
        sessionStorage.removeItem("regadoces_identificacao_v1");
        sessionStorage.removeItem("regadoces_resumo_v1");
      } catch {}
      if (data.pagamentoUrl) {
        // cartão: página segura do C6 Bank (volta para /pedido/<id> depois de pagar)
        window.location.href = data.pagamentoUrl;
        return;
      }
      router.push(`/pedido/${data.pedidoId}`);
      return;
    }
    setEnviando(false);
    setErro(data?.erro ?? "Não foi possível concluir o pagamento. Tente novamente.");
  }

  return (
    <CheckoutShell passo={3}>
      <div className="grid grid-cols-1 gap-[max(24px,2vw)] lg:grid-cols-[1.31fr_1fr]">
        <div>
          <h1 className="font-sans text-[clamp(28px,2vw,38px)] text-marrom">Pagamento Seguro</h1>
          <div className="mt-4 h-px w-full bg-marrom/40" />
          <p className="mt-4 font-sans text-[clamp(15px,1vw,19px)] text-marrom">
            Escolha como deseja pagar. Seus dados estão protegidos.
          </p>

          {/* opções: crédito / débito / pix */}
          <div className={`mt-6 grid grid-cols-1 gap-4 ${opcoes.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {opcoes.map(({ valor, titulo, icone }) => (
              <button
                key={valor}
                type="button"
                onClick={() => setMetodo(valor)}
                className={`flex items-center gap-3 border px-5 py-[max(12px,0.8vw)] text-left font-sans text-[clamp(16px,1.05vw,20px)] text-marrom ${
                  metodo === valor
                    ? "border-marrom bg-azul-btn"
                    : "border-marrom/60 bg-transparent"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 shrink-0 rounded-full border-2 border-marrom ${
                    metodo === valor ? "bg-marrom" : "bg-transparent"
                  }`}
                />
                <span aria-hidden>
                  {icone === "cartao" ? (
                    /* cartão em traço fino, como na LP */
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#421a14" strokeWidth="1.4">
                      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
                      <path d="M2.5 9.5h19M5.5 14.5h5" />
                    </svg>
                  ) : (
                    /* losango do Pix */
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#421a14" strokeWidth="1.4">
                      <path d="M12 2.8 21.2 12 12 21.2 2.8 12z" />
                      <path d="M8.2 12 12 8.2 15.8 12 12 15.8z" />
                    </svg>
                  )}
                </span>
                {titulo}
              </button>
            ))}
          </div>

          {metodo === "pix" ? (
            <div className="mt-8 rounded-[22px] border border-vinho/60 bg-branco-quente px-6 py-8">
              <p className="font-sans text-[17px] text-marrom">
                Ao finalizar o pedido, vamos gerar um <b>QR code Pix</b> (e o
                código copia e cola) para você pagar no app do seu banco. A
                confirmação é automática, em segundos.
              </p>
              {cartaoAtivo === false && (
                <p className="mt-3 font-sans text-[14px] text-marrom/70">
                  Pagamento com cartão em breve.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-8 rounded-[22px] border border-vinho/60 bg-branco-quente px-6 py-8">
              <p className="font-sans text-[17px] text-marrom">
                Ao finalizar o pedido, você será levado para a{" "}
                <b>página de pagamento segura do C6 Bank</b>, onde digita os dados do seu{" "}
                {metodo === "debito" ? "cartão de débito" : "cartão de crédito"}. Depois de pagar,
                você volta automaticamente para o seu pedido.
              </p>
              <p className="mt-3 font-sans text-[clamp(14px,0.95vw,18px)] font-semibold text-marrom">
                {metodo === "debito" ? "💳 Débito à vista" : "💳 Crédito à vista"}
              </p>
              <p className="mt-2 font-sans text-[14px] text-marrom/70">
                Seu cartão nunca passa pelo nosso site — os dados vão direto para o banco.
              </p>
            </div>
          )}

          {erro && <p className="mt-6 font-sans text-[15px] font-medium text-vinho">{erro}</p>}
        </div>

        <CartSummary
          passo={3}
          mostrarItens
          mostrarSelos
          ctaLabel={enviando ? "PROCESSANDO..." : "FINALIZAR PEDIDO"}
          onCta={finalizar}
          ctaDisabled={itens.length === 0 || enviando}
        />
      </div>
    </CheckoutShell>
  );
}
