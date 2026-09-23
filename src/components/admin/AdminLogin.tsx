"use client";

import { FormEvent, useState } from "react";

export default function AdminLogin() {
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        senha: fd.get("senha"),
      }),
    });
    setEnviando(false);
    if (res.ok) {
      window.location.reload();
    } else {
      const data = await res.json().catch(() => null);
      setErro(data?.erro ?? "Falha no login.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-creme px-4">
      <div className="w-full max-w-sm">
        <p className="text-center font-display text-5xl text-vinho">Regadoces</p>
        <p className="mt-2 text-center font-sans text-sm font-semibold uppercase tracking-widest text-marrom/70">
          Painel do administrador
        </p>
        <form
          onSubmit={onSubmit}
          className="mt-8 flex flex-col gap-4 rounded-2xl border border-vinho/40 bg-branco-quente p-7 shadow-sm"
        >
          <label className="font-sans text-sm font-semibold text-marrom">
            E-mail
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              className="mt-1 w-full rounded-md border border-marrom/20 bg-white px-3 py-2.5 font-sans text-[15px] font-normal text-marrom outline-none focus:border-vinho"
            />
          </label>
          <label className="font-sans text-sm font-semibold text-marrom">
            Senha
            <input
              name="senha"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-marrom/20 bg-white px-3 py-2.5 font-sans text-[15px] font-normal text-marrom outline-none focus:border-vinho"
            />
          </label>
          {erro && <p className="font-sans text-sm text-vinho">{erro}</p>}
          <button
            type="submit"
            disabled={enviando}
            className="mt-2 rounded-md bg-vinho py-3 font-sans text-[15px] font-semibold text-creme transition-colors hover:bg-marrom disabled:opacity-60"
          >
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
