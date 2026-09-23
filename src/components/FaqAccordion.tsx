"use client";

import { useState } from "react";

type Faq = { id: string; pergunta: string; resposta: string };

/* Acordeão do FAQ (fundo vinho, respostas em caixas marrons arredondadas). */
export default function FaqAccordion({ itens }: { itens: Faq[] }) {
  const [abertos, setAbertos] = useState<Record<string, boolean>>(
    Object.fromEntries(itens.map((i) => [i.id, true]))
  );

  return (
    <div className="flex flex-col gap-[max(16px,1.2vw)]">
      {itens.map((f) => (
        <div key={f.id}>
          <button
            onClick={() =>
              setAbertos((a) => ({ ...a, [f.id]: !a[f.id] }))
            }
            className="flex w-full items-start justify-between gap-4 text-left"
          >
            <span className="font-sans text-[clamp(16px,1vw,19px)] text-creme">
              {f.pergunta}
            </span>
            <span className="mt-1 font-sans text-creme">
              {abertos[f.id] ? "–" : "+"}
            </span>
          </button>
          {abertos[f.id] && (
            <div className="mt-2 rounded-xl bg-marrom/80 px-[max(20px,1.3vw)] py-[max(16px,1vw)]">
              <p className="whitespace-pre-line font-sans text-[clamp(14px,0.9vw,17px)] leading-relaxed text-creme">
                {f.resposta}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
