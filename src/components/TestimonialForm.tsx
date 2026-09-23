"use client";

import { FormEvent, useState } from "react";
import TicketButton from "./TicketButton";

/* Formulário "Adicionar depoimento" da Home (entra como pendente no admin). */
export default function TestimonialForm() {
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch("/api/testimonials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEnviando(false);
    if (res.ok) {
      setEnviado(true);
    } else {
      const data = await res.json().catch(() => null);
      setErro(data?.erro ?? "Não foi possível enviar. Tente novamente.");
    }
  }

  if (enviado) {
    return (
      <p className="mx-auto max-w-xl text-center font-sans text-lg text-creme">
        Obrigado pelo seu depoimento! Ele será publicado após aprovação. 💛
      </p>
    );
  }

  const inputCls = "w-full bg-creme px-4 py-[max(12px,0.85vw)] font-sans text-[clamp(15px,1vw,19px)] text-vinho placeholder-vinho/70 outline-none rounded-sm";

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-[min(100%,44vw)] min-w-[min(100%,600px)] flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input name="nome" required maxLength={60} placeholder="Nome" className={inputCls} />
        <input name="sobrenome" required maxLength={60} placeholder="Sobrenome" className={inputCls} />
        <input name="email" type="email" required maxLength={120} placeholder="E-mail" className={inputCls} />
        <input name="telefone" maxLength={20} placeholder="Telefone" className={inputCls} />
      </div>
      <textarea
        name="texto"
        required
        maxLength={600}
        rows={5}
        placeholder="Escreva sua avaliação aqui"
        className={inputCls}
      />
      {erro && <p className="font-sans text-sm text-azul">{erro}</p>}
      <div className="text-center">
        <TicketButton type="submit" disabled={enviando} className="min-w-[260px]">
          {enviando ? "ENVIANDO..." : "ENVIAR DEPOIMENTO"}
        </TicketButton>
      </div>
    </form>
  );
}
