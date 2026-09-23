/*
  Slug de URL (puro — usado no servidor e no navegador).
  "Torta Oreo Preta Fatia" → "torta-oreo-preta-fatia"
*/
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
