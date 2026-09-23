"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import TicketButton from "./TicketButton";
import type { Slide } from "@/lib/db";

/*
  Carrossel do topo da Home (LP: foto com overlay vinho, título Lazy
  Arie/Chewy, frase, subtítulo Montserrat, botão azul e 3 bolinhas).
  Os slides são gerenciados no painel do administrador.
*/
export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [atual, setAtual] = useState(0);
  const ativos = slides.filter((s) => s.ativo).sort((a, b) => a.ordem - b.ordem);

  useEffect(() => {
    if (ativos.length <= 1) return;
    const t = setInterval(() => setAtual((a) => (a + 1) % ativos.length), 6000);
    return () => clearInterval(t);
  }, [ativos.length]);

  if (ativos.length === 0) return null;

  return (
    <section className="relative h-[560px] w-full overflow-hidden sm:h-[730px]">
      {ativos.map((s, i) => {
        // sem tom por cima (foto clara), o texto passa a ser escuro para continuar legível
        const limpo = s.overlay === "nenhum";
        const corTexto = limpo ? "text-marrom" : "text-creme";
        return (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === atual ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <Image
            src={s.imagem}
            alt={s.frase}
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover"
          />
          {/* tom por cima da foto, definido slide a slide no painel:
              vinho (Home da LP), marrom (Encomendas) ou nenhum (foto limpa) */}
          {(s.overlay ?? "vinho") === "vinho" && (
            <div className="absolute inset-0 bg-gradient-to-r from-vinho/75 via-vinho/60 to-vinho/50" />
          )}
          {s.overlay === "marrom" && (
            <div className="absolute inset-0 bg-gradient-to-r from-marrom/75 via-marrom/60 to-marrom/50" />
          )}

          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-6xl px-6 pt-16">
              <div className="max-w-xl">
                <h1 className={`font-display text-4xl drop-shadow-md sm:text-5xl ${corTexto}`}>
                  {s.titulo}
                </h1>
                <p className={`mt-3 font-display text-3xl leading-tight drop-shadow-md sm:text-[40px] ${corTexto}`}>
                  {s.frase}
                </p>
                <p className={`mt-4 max-w-xs font-sans text-lg drop-shadow sm:text-xl ${corTexto}`}>
                  {s.subtitulo
                    .split(/(\*[^*]+\*)/)
                    .map((part, idx) =>
                      part.startsWith("*") ? (
                        <b key={idx}>{part.slice(1, -1)}</b>
                      ) : (
                        <span key={idx}>{part}</span>
                      )
                    )}
                </p>
                <div className="mt-6">
                  <TicketButton
                    href={s.linkBotao}
                    className="min-w-[300px] sm:min-w-[435px]"
                  >
                    {s.textoBotao}
                  </TicketButton>
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })}

      {/* bolinhas */}
      {ativos.length > 1 && (
        <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-3">
          {ativos.map((s, i) => (
            <button
              key={s.id}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setAtual(i)}
              className={`h-4 w-4 rounded-full transition-colors ${
                i === atual ? "bg-vinho" : "bg-creme/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
