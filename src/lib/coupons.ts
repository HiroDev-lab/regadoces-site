import type { Coupon } from "./db";

export function validarCupom(cupom: Coupon | undefined, subtotal: number) {
  if (!cupom || !cupom.ativo) return { ok: false as const, erro: "Cupom inválido." };
  if (cupom.validade && new Date(cupom.validade + "T23:59:59") < new Date()) {
    return { ok: false as const, erro: "Cupom expirado." };
  }
  if (cupom.usoMaximo > 0 && cupom.usos >= cupom.usoMaximo) {
    return { ok: false as const, erro: "Cupom esgotado." };
  }
  const desconto =
    cupom.tipo === "percentual"
      ? Math.round(subtotal * cupom.valor) / 100
      : Math.min(cupom.valor, subtotal);
  return { ok: true as const, desconto };
}
