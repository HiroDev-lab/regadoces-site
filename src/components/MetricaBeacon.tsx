"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/*
  Conta 1 visita por página vista (não roda no painel). Usa
  sendBeacon para não atrasar a navegação; fetch é o plano B.
*/
export default function MetricaBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/painel")) return;
    const body = JSON.stringify({ path: pathname });
    try {
      if (!navigator.sendBeacon?.("/api/metrica", new Blob([body], { type: "application/json" }))) {
        fetch("/api/metrica", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
      }
    } catch {
      /* métrica nunca pode quebrar o site */
    }
  }, [pathname]);

  return null;
}
