import Link from "next/link";
import { ReactNode } from "react";

/*
  Botão azul em formato de "ticket" (cantos recortados) usado em todas
  as LPs. Camada única, sem sombra deslocada — o designer apontou que a
  versão com a cópia atrás parecia "duplicada".
*/
type Props = {
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  /** classes do texto (troca o tamanho padrão text-sm/base) */
  textClassName?: string;
  /** ex.: "_blank" para abrir em nova aba (PDFs, links externos) */
  target?: string;
};

export default function TicketButton({
  href,
  onClick,
  type = "button",
  children,
  className = "",
  disabled,
  textClassName = "text-sm sm:text-base",
  target,
}: Props) {
  const fullWidth = className.includes("w-full");
  const wrapperCls = fullWidth ? "block w-full" : "inline-block";
  const inner = (
    <span className={`relative inline-block max-w-full ${className}`}>
      <span className={`ticket ticket-face relative block px-10 py-3 text-center font-sans font-semibold tracking-wide text-marrom transition-[filter] duration-150 hover:brightness-95 ${textClassName}`}>
        {children}
      </span>
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={wrapperCls}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${wrapperCls} disabled:opacity-60`}
    >
      {inner}
    </button>
  );
}
