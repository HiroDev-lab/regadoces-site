"use client";

import { useRef, useState } from "react";

/* Peças de UI compartilhadas do painel. */

export function H1({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-sans text-3xl font-bold text-marrom">{children}</h1>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-marrom/10 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block font-sans text-[13px] font-semibold text-marrom">
      {label}
      {children}
    </label>
  );
}

export const inputCls =
  "mt-1 w-full rounded-md border border-marrom/20 bg-white px-3 py-2 font-sans text-[14px] font-normal text-marrom outline-none focus:border-vinho";

export function BtnPrimary(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-md bg-vinho px-5 py-2.5 font-sans text-[14px] font-semibold text-creme transition-colors hover:bg-marrom disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}

export function BtnGhost(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-md border border-marrom/20 px-4 py-2 font-sans text-[13px] font-semibold text-marrom transition-colors hover:bg-creme ${props.className ?? ""}`}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2"
      aria-pressed={checked}
    >
      <span
        className={`relative inline-block h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-green-600" : "bg-marrom/25"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
      {label && (
        <span className="font-sans text-[13px] font-medium text-marrom">
          {label}
        </span>
      )}
    </button>
  );
}

/** Upload de imagem → POST /api/admin/upload → devolve a URL salva. */
export function ImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState("");

  async function upload(file: File) {
    setErro("");
    setSubindo(true);
    const fd = new FormData();
    fd.append("arquivo", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => null);
    setSubindo(false);
    if (res.ok && data?.url) {
      onChange(data.url);
    } else {
      setErro(data?.erro ?? "Falha no upload.");
    }
  }

  return (
    <div className="mt-1 flex items-center gap-3">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Imagem selecionada"
          className="h-16 w-16 rounded-md border border-marrom/15 object-cover"
        />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-marrom/30 text-2xl">
          🖼️
        </span>
      )}
      <div>
        <BtnGhost type="button" onClick={() => ref.current?.click()} disabled={subindo}>
          {subindo ? "Enviando..." : value ? "Trocar foto" : "Enviar foto"}
        </BtnGhost>
        {erro && <p className="mt-1 font-sans text-[12px] text-vinho">{erro}</p>}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
