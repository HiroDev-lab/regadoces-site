/*
  Divisor "derretido" entre seções — a calda escorrendo que aparece em
  todas as LPs. `color` é a cor da seção de CIMA (a calda escorre por
  cima da seção de baixo).

  Técnica: o desenho OFICIAL do designer ("borda ... de detalhes.svg",
  cópia em docs/design/bordas-oficiais) recortado na zona dos pingos e
  espelhado (public/images/drips/calda.svg) aplicado como CSS mask — a cor
  vem do CSS.

  Escala (medida nas LPs em 1920px): o designer usa UMA cópia do desenho
  na largura da tela e varia a altura por seção (de ~160px a ~400px),
  achatando o desenho quando precisa. Por isso o mask ocupa 200% da
  largura (o tile tem 2 cópias espelhadas) e a altura vem da prop `h`
  em vw (padrão 11vw ≈ 210px em 1920), com mínimo/máximo p/ celular e
  telas gigantes. `overlap` puxa a calda pra cima (margem negativa)
  quando a seção de cima deve ficar por cima dela (ex.: cards da Home).
*/
import type { CSSProperties } from "react";

const TILE = "/images/drips/calda.svg";

type Props = {
  color: string;
  className?: string;
  flip?: boolean;
  /** altura em vw (LP: 8.5 = calda baixinha, 11 = padrão, 19 = calda grande) */
  h?: number;
  /** margem negativa no topo (ex.: "-19vw") para a seção anterior sobrepor a calda */
  overlap?: string;
};

export default function Drip({ color, className = "", flip = false, h = 11, overlap }: Props) {
  const mask: CSSProperties = {
    backgroundColor: color,
    WebkitMaskImage: `url("${TILE}")`,
    maskImage: `url("${TILE}")`,
    WebkitMaskRepeat: "repeat-x",
    maskRepeat: "repeat-x",
    WebkitMaskPosition: "left top",
    maskPosition: "left top",
    // 200% = as 2 cópias espelhadas do tile → 1 desenho por largura de tela
    WebkitMaskSize: "200% 100%",
    maskSize: "200% 100%",
    height: `clamp(${Math.round(h * 8)}px, ${h}vw, ${Math.round(h * 19.2)}px)`,
  };
  const wrapper: CSSProperties = {
    ...(flip ? { transform: "scaleX(-1)" } : {}),
    ...(overlap ? { marginTop: overlap } : {}),
  };
  return (
    <div
      aria-hidden
      className={`pointer-events-none relative -mt-px w-full overflow-hidden leading-none ${className}`}
      style={wrapper}
    >
      <div className="w-full" style={mask} />
    </div>
  );
}
