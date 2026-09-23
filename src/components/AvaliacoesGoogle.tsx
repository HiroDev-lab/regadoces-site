"use client";

import { useState } from "react";

/*
  Seção "Avaliações do Google" (pedido do Ricardo, 31/08): mostra as
  avaliações de 4 em 4 com setas de carrossel. A nota média, o total e
  o link do perfil vêm do painel (Depoimentos → dados do Google).
*/

export type Avaliacao = {
  id: string;
  nome: string;
  sobrenome: string;
  texto: string;
  nota: number;
};

export function Estrelas({ nota, className = "" }: { nota: number; className?: string }) {
  return (
    <span aria-label={`${nota} de 5 estrelas`} className={`text-[#fbbc05] ${className}`}>
      {"★".repeat(Math.round(nota))}
      <span className="text-marrom/25">{"★".repeat(5 - Math.round(nota))}</span>
    </span>
  );
}

/** "G" colorido do Google (SVG oficial simplificado) */
export function LogoGoogle({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.7 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.5 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.7 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.8c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.2-10.1 7.2-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.5-5.5l-7.5-5.8c-2.1 1.4-4.8 2.3-8 2.3-6.3 0-11.6-4-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function CardAvaliacao({ a }: { a: Avaliacao }) {
  return (
    <div className="bg-azul-btn px-6 py-7">
      <div className="flex items-start justify-between gap-3">
        <p className="font-sans text-2xl leading-tight text-marrom">
          {a.nome}
          <br />
          {a.sobrenome}
        </p>
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center bg-white">
          <LogoGoogle className="h-7 w-7" />
        </span>
      </div>
      <Estrelas nota={a.nota} className="mt-3 block text-[18px]" />
      <p className="mt-3 font-sans text-[14px] leading-relaxed text-marrom">{a.texto}</p>
    </div>
  );
}

export default function AvaliacoesGoogle({ avaliacoes }: { avaliacoes: Avaliacao[] }) {
  const POR_VEZ = 4;
  const paginas = Math.max(1, Math.ceil(avaliacoes.length / POR_VEZ));
  const [pagina, setPagina] = useState(0);
  const visiveis = avaliacoes.slice(pagina * POR_VEZ, pagina * POR_VEZ + POR_VEZ);

  const seta =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-creme/60 bg-white/10 text-xl text-creme transition-opacity hover:opacity-70 disabled:opacity-25";

  return (
    <div className="mx-auto flex max-w-[1400px] items-center gap-3 sm:gap-5">
      <button
        type="button"
        aria-label="Avaliações anteriores"
        className={seta}
        disabled={pagina === 0}
        onClick={() => setPagina((p) => Math.max(0, p - 1))}
      >
        ‹
      </button>
      <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {visiveis.map((a) => (
          <CardAvaliacao key={a.id} a={a} />
        ))}
      </div>
      <button
        type="button"
        aria-label="Próximas avaliações"
        className={seta}
        disabled={pagina >= paginas - 1}
        onClick={() => setPagina((p) => Math.min(paginas - 1, p + 1))}
      >
        ›
      </button>
    </div>
  );
}
