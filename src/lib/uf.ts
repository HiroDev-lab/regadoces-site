/*
  Estado (UF) do endereço.
  O campo da tela limita a 2 letras, mas o preenchimento automático do
  celular (iPhone/Safari, Chrome) ignora esse limite e joga o nome completo
  ("Paraná"). Aqui qualquer forma vira a sigla: "PR", "pr", "Paraná",
  "PARANÁ", "parana" → "PR". O que não for reconhecido volta como "" .
*/

const UFS: Record<string, string> = {
  AC: "acre",
  AL: "alagoas",
  AP: "amapa",
  AM: "amazonas",
  BA: "bahia",
  CE: "ceara",
  DF: "distrito federal",
  ES: "espirito santo",
  GO: "goias",
  MA: "maranhao",
  MT: "mato grosso",
  MS: "mato grosso do sul",
  MG: "minas gerais",
  PA: "para",
  PB: "paraiba",
  PR: "parana",
  PE: "pernambuco",
  PI: "piaui",
  RJ: "rio de janeiro",
  RN: "rio grande do norte",
  RS: "rio grande do sul",
  RO: "rondonia",
  RR: "roraima",
  SC: "santa catarina",
  SP: "sao paulo",
  SE: "sergipe",
  TO: "tocantins",
};

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Devolve a sigla de 2 letras ou "" quando não dá para reconhecer. */
export function normalizarUF(valor: string | null | undefined): string {
  const limpo = semAcento(valor ?? "").replace(/[.\-]/g, "");
  if (!limpo) return "";
  const sigla = limpo.toUpperCase();
  if (sigla.length === 2 && sigla in UFS) return sigla;
  for (const [uf, nome] of Object.entries(UFS)) {
    if (nome === limpo) return uf;
  }
  return "";
}
