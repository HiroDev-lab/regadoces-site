// Preenche o "Roteiro de Testes - C6 Developers" (docx) com os dados da
// organização, marca as APIs testadas (env APIS="AUTENTICAÇÃO,PIX" por padrão) e cola as
// evidências geradas por scripts/c6-evidencias.mjs nos campos de formulário.
// Uso: node scripts/preencher-roteiro-c6.mjs <roteiro.docx> <evidencias.json> <saida.docx>
// (precisa do pacote jszip: npm i jszip)
import JSZip from "jszip";
import { readFileSync, writeFileSync } from "node:fs";

const [, , entrada, evidJson, saida] = process.argv;
if (!entrada || !evidJson || !saida) { console.error("uso: node preencher-roteiro-c6.mjs roteiro.docx evidencias.json saida.docx"); process.exit(1); }

const ORG = {
  "CNPJ / IDENTIFICADOR DA ORGANIZAÇÃO": "62.056.183/0001-14",
  "NOME DA EMPRESA CLIENTE / PARCEIRA": "Regadoces Confeitaria Ltda",
  "NOME DO SOFTWARE": "Loja online Regadoces (regadoces.com.br) — e-commerce próprio em Next.js",
  "RESPONSÁVEL PELA EMPRESA": "Ricardo Monteiro",
  "E-MAIL": "regadoces@gmail.com",
  "TELEFONE": "(41) 98522-2525",
};
const APIS_TESTADAS = (process.env.APIS || "AUTENTICAÇÃO,PIX").split(",").map((s) => s.trim()).filter(Boolean);
const ev = JSON.parse(readFileSync(evidJson, "utf8"));

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// texto com quebras de linha → runs com <w:br/>
const runs = (texto) => texto.split("\n").map((l) => `<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">${esc(l)}</w:t></w:r>`).join("<w:r><w:br/></w:r>");

const zip = await JSZip.loadAsync(readFileSync(entrada));
let xml = await zip.file("word/document.xml").async("string");
let preenchidos = 0;

/** Preenche o resultado do 1º campo FORMTEXT encontrado a partir de `from`. Retorna o índice final. */
function preencherCampo(from, texto) {
  const f = xml.indexOf("FORMTEXT", from);
  if (f < 0) return -1;
  const sep = xml.indexOf('w:fldCharType="separate"', f);
  const end = xml.indexOf('w:fldCharType="end"', sep);
  // fim do <w:r> que contém o separate
  const rEnd = xml.indexOf("</w:r>", sep) + "</w:r>".length;
  // início do <w:r> que contém o end
  const rBegin = Math.max(xml.lastIndexOf("<w:r>", end), xml.lastIndexOf("<w:r ", end));
  xml = xml.slice(0, rEnd) + runs(texto) + xml.slice(rBegin);
  preenchidos++;
  return rEnd + texto.length;
}

// 1) dados da organização
for (const [label, valor] of Object.entries(ORG)) {
  const i = xml.indexOf(`<w:t>${label}</w:t>`);
  if (i < 0) { console.warn("label não encontrado:", label); continue; }
  const cell = xml.indexOf("<w:tc>", i);
  if (preencherCampo(cell, valor) < 0) console.warn("campo não encontrado para", label);
}

// 2) checkboxes das APIs testadas
for (const api of APIS_TESTADAS) {
  const i = xml.indexOf(`<w:t>${api}</w:t>`);
  if (i < 0) { console.warn("api não encontrada:", api); continue; }
  // o checkbox tem de estar na MESMA linha da tabela (a linha AUTENTICAÇÃO não tem
  // checkbox — é obrigatória — e sem esta trava o script marcaria a linha seguinte)
  const cb = xml.indexOf("<w:checkBox>", i), fimLinha = xml.indexOf("</w:tr>", i);
  if (cb < 0 || cb > fimLinha) { console.warn("sem checkbox na linha de", api, "(ok se for AUTENTICAÇÃO)"); continue; }
  const cbEnd = xml.indexOf("</w:checkBox>", cb);
  let bloco = xml.slice(cb, cbEnd).replace(/<w:checked[^>]*\/>/g, "").replace(/<w:default w:val="[01]"\/>/, '<w:default w:val="1"/>');
  if (!/<w:default/.test(bloco)) bloco += '<w:default w:val="1"/>';
  bloco += "<w:checked/>";
  xml = xml.slice(0, cb) + bloco + xml.slice(cbEnd);
  // o caractere exibido do FORMCHECKBOX (☐ → ☒) — campo legado mostra pelo estado, mas trocamos o texto se existir
  const sep = xml.indexOf('w:fldCharType="separate"', cb);
  const end = xml.indexOf('w:fldCharType="end"', sep);
  xml = xml.slice(0, sep) + xml.slice(sep, end).replace(/<w:t[^>]*>[^<]*<\/w:t>/, "<w:t>☒</w:t>") + xml.slice(end);
  preenchidos++;
}

// 3) evidências: o texto do docx é quebrado em vários <w:t>, então montamos uma
// versão "só texto" com o mapa de posições para achar "TESTE: <id>" seguido de
// "Status Code - Retornado" (a tabela de evidência) e preencher os 2 campos.
function mapaTexto() {
  const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  let texto = "", pos = [], m;
  while ((m = re.exec(xml))) {
    const inicio = m.index + m[0].indexOf(">") + 1;
    for (let k = 0; k < m[1].length; k++) { texto += m[1][k]; pos.push(inicio + k); }
  }
  return { texto, pos };
}
for (const [id, e] of Object.entries(ev)) {
  const { texto, pos } = mapaTexto();
  const marca = `TESTE: ${id}`;
  let t = 0, achou = -1;
  while ((t = texto.indexOf(marca, t)) >= 0) {
    const k = texto.indexOf("Status Code - Retornado", t);
    if (k >= 0 && k - t < 200) { achou = pos[k]; break; }
    t += marca.length;
  }
  if (achou < 0) { console.warn("tabela de evidência não encontrada:", id); continue; }
  const p1 = preencherCampo(achou, `${typeof e.status === "number" ? "HTTP " + e.status + (e.ok ? "" : " (falhou)") : e.status}
${new Date(e.quando).toLocaleString("pt-BR")}`);
  if (p1 < 0) continue;
  preencherCampo(p1, `${e.request}

Response body:
${e.body}`);
}

zip.file("word/document.xml", xml);
writeFileSync(saida, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
console.log(`campos preenchidos: ${preenchidos} → ${saida}`);
