"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CartSummary from "@/components/CartSummary";
import CheckoutShell from "@/components/CheckoutShell";
import { useCart } from "@/components/CartContext";
import { normalizarUF } from "@/lib/uf";

/*
  Passo 2 — Identificação de entrega (LP 02).
  Os dados ficam em sessionStorage e são validados de novo no servidor
  na hora de criar o pedido (POST /api/checkout).
*/

export type Identificacao = {
  nome: string;
  sobrenome: string;
  email: string;
  cpf: string;
  telefone: string;
  tipo: "entrega" | "retirada";
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};

const KEY = "regadoces_identificacao_v1";

const VAZIO: Identificacao = {
  nome: "",
  sobrenome: "",
  email: "",
  cpf: "",
  telefone: "",
  tipo: "entrega",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

export default function IdentificacaoPage() {
  const router = useRouter();
  const { itens } = useCart();
  const [form, setForm] = useState<Identificacao>(VAZIO);
  const [erro, setErro] = useState("");
  // campos vazios ganham borda vinho quando o cliente tenta avançar
  const [camposFaltando, setCamposFaltando] = useState<(keyof Identificacao)[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const salvo = { ...VAZIO, ...JSON.parse(raw) } as Identificacao;
        // quem salvou "PARANÁ" antes da correção ganha a sigla ao voltar
        if (salvo.estado && salvo.estado.length > 2) {
          salvo.estado = normalizarUF(salvo.estado) || salvo.estado;
        }
        setForm(salvo);
      }
    } catch {}
  }, []);

  function set(campo: keyof Identificacao, valor: string) {
    setForm((f) => {
      const next = { ...f, [campo]: valor };
      try {
        sessionStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  async function buscarCep() {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((f) => {
          const next = {
            ...f,
            endereco: data.logradouro || f.endereco,
            bairro: data.bairro || f.bairro,
            cidade: data.localidade || f.cidade,
            estado: data.uf || f.estado,
          };
          try {
            sessionStorage.setItem(KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    } catch {
      /* sem internet: preenchimento manual */
    }
  }

  function continuar() {
    setErro("");
    setCamposFaltando([]);
    // diz exatamente o que falta (e leva o cliente até o 1º campo vazio)
    const obrigatorios: [keyof Identificacao, string][] = [
      ["nome", "nome"],
      ["sobrenome", "sobrenome"],
      ["email", "e-mail"],
      ["cpf", "CPF"],
      ["telefone", "telefone"],
    ];
    if (form.tipo === "entrega") {
      obrigatorios.push(
        ["cep", "CEP"],
        ["endereco", "endereço"],
        ["numero", "número"],
        ["bairro", "bairro"],
        ["cidade", "cidade"],
        ["estado", "estado (UF)"]
      );
    }
    const faltando = obrigatorios.filter(([campo]) => !String(form[campo] ?? "").trim());
    if (faltando.length > 0) {
      const nomes = faltando.map(([, rotulo]) => rotulo).join(", ");
      setErro(
        form.tipo === "entrega" && faltando.some(([c]) => c === "cep" || c === "endereco" || c === "numero" || c === "bairro" || c === "cidade" || c === "estado")
          ? `Falta preencher: ${nomes}. (Ou escolha "Retirada no Local".)`
          : `Falta preencher: ${nomes}.`
      );
      setCamposFaltando(faltando.map(([c]) => c));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setErro("O e-mail parece incompleto (ex.: nome@gmail.com).");
      setCamposFaltando(["email"]);
      return;
    }
    if (form.cpf.replace(/\D/g, "").length !== 11) {
      setErro("O CPF precisa ter 11 números.");
      setCamposFaltando(["cpf"]);
      return;
    }
    if (form.tipo === "entrega") {
      // "Paraná"/"PARANÁ" (autofill do celular) vira "PR"; o que não for
      // reconhecido é barrado aqui, com aviso claro, e não no servidor
      const uf = normalizarUF(form.estado);
      if (!uf) {
        setErro('Estado não reconhecido. Use a sigla de 2 letras (ex.: PR) ou toque em "Buscar" ao lado do CEP.');
        setCamposFaltando(["estado"]);
        return;
      }
      if (uf !== form.estado) set("estado", uf);
    }
    router.push("/checkout/pagamento");
  }

  const falta = (campo: keyof Identificacao) =>
    camposFaltando.includes(campo) ? " !border-vinho ring-1 ring-vinho/60" : "";

  const label = "font-sans text-[clamp(16px,1.05vw,20px)] text-marrom";
  const input =
    "mt-1 w-full rounded-sm bg-branco-quente px-4 py-[max(12px,0.7vw)] font-sans text-[clamp(15px,0.9vw,17px)] text-marrom placeholder-marrom/40 outline-none border border-transparent focus:border-vinho/40";
  const inputCreme =
    "mt-1 w-full rounded-sm bg-creme px-4 py-[max(12px,0.7vw)] font-sans text-[clamp(15px,0.9vw,17px)] text-marrom placeholder-marrom/40 outline-none border border-transparent focus:border-vinho/40";

  return (
    <CheckoutShell passo={2}>
      <div className="grid grid-cols-1 gap-[max(24px,2vw)] lg:grid-cols-[1.31fr_1fr]">
        <div>
          <h1 className="font-sans text-[clamp(28px,2vw,38px)] text-marrom">Identificação de entrega</h1>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="nome">Nome</label>
              <input id="nome" className={input + falta("nome")} placeholder="Primeiro nome" value={form.nome} onChange={(e) => set("nome", e.target.value)} maxLength={60} />
            </div>
            <div>
              <label className={label} htmlFor="sobrenome">Sobrenome</label>
              <input id="sobrenome" className={input + falta("sobrenome")} placeholder="Sobrenome completo" value={form.sobrenome} onChange={(e) => set("sobrenome", e.target.value)} maxLength={80} />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="email">E-mail</label>
              <input id="email" type="email" className={input + falta("email")} placeholder="exemplodeemail@gmail.com" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={120} />
            </div>
            <div>
              <label className={label} htmlFor="cpf">CPF</label>
              <input id="cpf" inputMode="numeric" className={input + falta("cpf")} placeholder="000.000.000-00" value={form.cpf} onChange={(e) => set("cpf", e.target.value)} maxLength={14} />
            </div>
            <div>
              <label className={label} htmlFor="telefone">Telefone / Whatsapp</label>
              <input id="telefone" inputMode="tel" className={input + falta("telefone")} placeholder="(00) 0000-0000" value={form.telefone} onChange={(e) => set("telefone", e.target.value)} maxLength={16} />
            </div>
          </div>

          <h2 className="mt-[max(40px,3vw)] font-sans text-[clamp(28px,2vw,38px)] text-marrom">Entrega ou Retirada</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(
              [
                ["entrega", "Entrega Padrão", "Receba no seu endereço com todo o cuidado (entregas no raio de até 15km do nosso endereço)."],
                ["retirada", "Retirada no Local", "Busque em nosso endereço no Batel sem custo."],
              ] as const
            ).map(([valor, titulo, desc]) => (
              <button
                key={valor}
                type="button"
                onClick={() => set("tipo", valor)}
                className={`bg-azul-btn px-[max(20px,1.5vw)] py-[max(16px,1.3vw)] text-left transition-shadow ${
                  form.tipo === valor ? "ring-2 ring-vinho" : ""
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <span
                      className={`inline-block h-5 w-5 rounded-full border-2 border-white ${
                        form.tipo === valor ? "bg-vinho" : "bg-white"
                      }`}
                    />
                    <span className="font-sans text-[clamp(16px,1.05vw,20px)] font-medium text-marrom">{titulo}</span>
                  </span>
                  <span aria-hidden>
                    {valor === "entrega" ? (
                      /* motoboy (traço fino, como na LP) */
                      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="#421a14" strokeWidth="1.4">
                        <circle cx="6" cy="17" r="2.6" />
                        <circle cx="18" cy="17" r="2.6" />
                        <path d="M6 17h7l2.5-5.5H19M13 8h2.5l1.5 3.5M9.5 8.5c1.8 0 3 1.3 3.5 3" />
                        <path d="M14.5 6.5h3" />
                      </svg>
                    ) : (
                      /* lojinha (traço fino, como na LP) */
                      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="#421a14" strokeWidth="1.4">
                        <path d="M4 9.5 5.2 5h13.6L20 9.5" />
                        <path d="M4 9.5c0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.2c0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.2c0 1.2 1 2.2 2.2 2.2S17.2 10.7 17.2 9.5c0 1.2 1 2.2 2.2 2.2" />
                        <path d="M5.5 11.5V19h13v-7.5M10 19v-4.5h4V19" />
                      </svg>
                    )}
                  </span>
                </span>
                <span className="mt-3 block font-sans text-[clamp(13px,0.85vw,16px)] text-marrom/80">{desc}</span>
              </button>
            ))}
          </div>

          {form.tipo === "entrega" && (
            <div className="mt-10 rounded-[22px] border border-vinho/70 bg-branco-quente px-6 py-7 sm:px-8">
              <h3 className="font-sans text-[clamp(24px,1.7vw,33px)] text-marrom">Endereço de entrega</h3>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr]">
                <div>
                  <label className={label} htmlFor="cep">CEP</label>
                  <div className="flex gap-0">
                    <input id="cep" inputMode="numeric" className={`${inputCreme} rounded-r-none${falta("cep")}`} placeholder="00000-000" value={form.cep} onChange={(e) => set("cep", e.target.value)} onBlur={buscarCep} maxLength={9} />
                    <button type="button" onClick={buscarCep} className="mt-1 rounded-r-sm bg-creme px-5 font-sans text-[clamp(15px,0.9vw,17px)] font-medium text-marrom hover:brightness-95">
                      Buscar
                    </button>
                  </div>
                </div>
                <div />
                <div>
                  <label className={label} htmlFor="endereco">Endereço</label>
                  <input id="endereco" className={inputCreme + falta("endereco")} placeholder="Nome da rua, avenida..." value={form.endereco} onChange={(e) => set("endereco", e.target.value)} maxLength={120} />
                </div>
                <div>
                  <label className={label} htmlFor="numero">Número</label>
                  <input id="numero" className={inputCreme + falta("numero")} placeholder="Ex: 123" value={form.numero} onChange={(e) => set("numero", e.target.value)} maxLength={10} />
                </div>
                <div>
                  <label className={label} htmlFor="complemento">Complemento (opcional)</label>
                  <input id="complemento" className={inputCreme} placeholder="Apto, bloco, casa..." value={form.complemento} onChange={(e) => set("complemento", e.target.value)} maxLength={60} />
                </div>
                <div>
                  <label className={label} htmlFor="bairro">Bairro</label>
                  <input id="bairro" className={inputCreme + falta("bairro")} placeholder="Seu bairro" value={form.bairro} onChange={(e) => set("bairro", e.target.value)} maxLength={60} />
                </div>
                <div>
                  <label className={label} htmlFor="cidade">Cidade</label>
                  <input id="cidade" className={inputCreme + falta("cidade")} placeholder="Sua cidade" value={form.cidade} onChange={(e) => set("cidade", e.target.value)} maxLength={60} />
                </div>
                <div>
                  <label className={label} htmlFor="estado">Estado</label>
                  <input id="estado" className={inputCreme + falta("estado")} placeholder="UF" value={form.estado} onChange={(e) => {
                    const v = e.target.value;
                    // autofill fura o maxLength e manda "Paraná" → guarda "PR"
                    set("estado", v.length > 2 ? normalizarUF(v) || v.toUpperCase() : v.toUpperCase());
                  }} maxLength={2} autoComplete="address-level1" />
                </div>
              </div>
            </div>
          )}

          {/* erro aparece junto do botão, dentro do resumo (visível no celular) */}
        </div>

        <CartSummary
          passo={2}
          mostrarItens
          ctaLabel="PRÓXIMO PASSO PAGAMENTO"
          onCta={continuar}
          ctaDisabled={itens.length === 0}
          erro={erro || undefined}
        />
      </div>
    </CheckoutShell>
  );
}
