/*
  Preço promocional (sem dependências de servidor — usado também nos
  componentes do navegador). Regra: a promoção só vale se for um valor
  maior que zero e MENOR que o preço normal; fora disso, vale o normal.
*/

export type ComPreco = { preco: number; precoPromocional?: number | null };

/** Preço que o cliente paga (promocional quando houver). */
export function precoAtual(p: ComPreco): number {
  const promo = p.precoPromocional;
  return promo != null && promo > 0 && promo < p.preco ? promo : p.preco;
}

/** true quando o produto está com preço promocional válido. */
export function emPromocao(p: ComPreco): boolean {
  return precoAtual(p) < p.preco;
}
