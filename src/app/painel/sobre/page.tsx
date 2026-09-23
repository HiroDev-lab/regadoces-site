"use client";

import { useEffect, useState } from "react";
import type { SobreConteudo } from "@/lib/db";
import { BtnPrimary, Card, Field, H1, ImageUpload, inputCls } from "@/components/admin/ui";

/*
  Edita a página "Sobre nós" (pedido do Ricardo, 31/08): parágrafos do
  topo, seção "O que fazemos" (título/texto/botão + as 4 fotos que abrem
  no hover), "Eventos e festas" e "Feito por pessoas" (foto da cozinha +
  textos + botão). As 2 fotos do hero ficam fixas (combinado com ele).
*/
export default function AdminSobre() {
  const [dados, setDados] = useState<SobreConteudo | null>(null);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch("/api/admin/sobre")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setDados(d); });
  }, []);

  function mudar<K extends keyof SobreConteudo>(campo: K, valor: SobreConteudo[K]) {
    setDados((d) => (d ? { ...d, [campo]: valor } : d));
    setMsg("");
    setErro("");
  }

  /** "linha em branco" separa parágrafos; Enter simples vira espaço */
  function paragrafos(texto: string): string[] {
    return texto
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
      .filter(Boolean);
  }

  async function salvar() {
    if (!dados) return;
    setMsg("");
    setErro("");
    setSalvando(true);
    const envio = {
      ...dados,
      heroParagrafos: paragrafos(heroTexto),
      cozinhaParagrafos: paragrafos(cozinhaTexto),
    };
    const res = await fetch("/api/admin/sobre", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envio),
    });
    setSalvando(false);
    if (res.ok) {
      setDados(await res.json());
      setMsg("Salvo! Já está valendo no site.");
    } else {
      const data = await res.json().catch(() => null);
      setErro(data?.erro ?? "Erro ao salvar. Confira se nenhum campo ficou vazio.");
    }
  }

  /*
    Os parágrafos ficam como TEXTO CRU no textarea (Enter funciona normal)
    e só viram lista na hora de salvar. Antes o campo era "controlado" pelo
    array já quebrado: cada Enter era engolido e o cursor pulava pro fim.
  */
  const [heroTexto, setHeroTexto] = useState("");
  const [cozinhaTexto, setCozinhaTexto] = useState("");
  const [textoCarregado, setTextoCarregado] = useState(false);
  useEffect(() => {
    if (dados && !textoCarregado) {
      setHeroTexto(dados.heroParagrafos.join("\n\n"));
      setCozinhaTexto(dados.cozinhaParagrafos.join("\n\n"));
      setTextoCarregado(true);
    }
  }, [dados, textoCarregado]);

  const areaParagrafos = (valor: string, setValor: (v: string) => void) => (
    <textarea
      className={inputCls + " min-h-[220px]"}
      value={valor}
      onChange={(e) => {
        setValor(e.target.value);
        setMsg("");
        setErro("");
      }}
    />
  );

  return (
    <div>
      <H1>Sobre nós</H1>
      <p className="mt-1 font-sans text-[13px] text-marrom/60">
        Textos e fotos da página Sobre nós. Nos parágrafos, deixe uma linha em
        branco entre um parágrafo e outro. Nos títulos, o Enter vira quebra de
        linha no site.
      </p>

      {!dados ? (
        <p className="mt-8 font-sans text-[14px] text-marrom/60">Carregando…</p>
      ) : (
        <div className="mt-6 flex max-w-3xl flex-col gap-4">
          <Card>
            <p className="font-sans text-lg font-bold text-marrom">Topo da página</p>
            <div className="mt-3">
              <Field label="Parágrafos do 'Sobre nós' (linha em branco separa os parágrafos)">
                {areaParagrafos(heroTexto, setHeroTexto)}
              </Field>
            </div>
          </Card>

          <Card>
            <p className="font-sans text-lg font-bold text-marrom">O que fazemos</p>
            <div className="mt-3 flex flex-col gap-4">
              <Field label="Título">
                <textarea
                  className={inputCls + " min-h-[60px]"}
                  value={dados.fazemosTitulo}
                  onChange={(e) => mudar("fazemosTitulo", e.target.value)}
                />
              </Field>
              <Field label="Texto">
                <textarea
                  className={inputCls + " min-h-[110px]"}
                  value={dados.fazemosTexto}
                  onChange={(e) => mudar("fazemosTexto", e.target.value)}
                />
              </Field>
              <Field label="Texto do botão">
                <input
                  className={inputCls}
                  value={dados.fazemosBotao}
                  onChange={(e) => mudar("fazemosBotao", e.target.value)}
                />
              </Field>
              <div>
                <p className="font-sans text-[12px] font-bold uppercase tracking-wide text-marrom/60">
                  As 4 fotos que abrem ao passar o mouse
                </p>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {dados.tiras.map((t, i) => (
                    <div key={i} className="rounded-lg border border-marrom/10 p-2">
                      <p className="font-sans text-[12px] font-semibold text-marrom/60">Foto {i + 1}</p>
                      <ImageUpload
                        value={t}
                        onChange={(url) =>
                          mudar("tiras", dados.tiras.map((x, j) => (j === i ? url : x)))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <p className="font-sans text-lg font-bold text-marrom">Eventos e festas</p>
            <div className="mt-3 flex flex-col gap-4">
              <Field label="Título">
                <textarea
                  className={inputCls + " min-h-[60px]"}
                  value={dados.eventosTitulo}
                  onChange={(e) => mudar("eventosTitulo", e.target.value)}
                />
              </Field>
              <Field label="Frase de destaque">
                <textarea
                  className={inputCls + " min-h-[60px]"}
                  value={dados.eventosTexto1}
                  onChange={(e) => mudar("eventosTexto1", e.target.value)}
                />
              </Field>
              <Field label="Texto">
                <textarea
                  className={inputCls + " min-h-[90px]"}
                  value={dados.eventosTexto2}
                  onChange={(e) => mudar("eventosTexto2", e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <p className="font-sans text-lg font-bold text-marrom">Feito por pessoas (foto da cozinha)</p>
            <div className="mt-3 flex flex-col gap-4">
              <Field label="Foto grande">
                <ImageUpload value={dados.cozinhaFoto} onChange={(url) => mudar("cozinhaFoto", url)} />
              </Field>
              <Field label="Título em cima da foto">
                <input
                  className={inputCls}
                  value={dados.cozinhaTitulo}
                  onChange={(e) => mudar("cozinhaTitulo", e.target.value)}
                />
              </Field>
              <Field label="Parágrafos (linha em branco separa os parágrafos)">
                {areaParagrafos(cozinhaTexto, setCozinhaTexto)}
              </Field>
              <Field label="Texto do botão">
                <input
                  className={inputCls}
                  value={dados.cozinhaBotao}
                  onChange={(e) => mudar("cozinhaBotao", e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <div className="flex items-center gap-4">
            <BtnPrimary disabled={salvando} onClick={salvar}>
              {salvando ? "Salvando..." : "Salvar tudo"}
            </BtnPrimary>
            {msg && <p className="font-sans text-[13px] font-semibold text-green-700">{msg}</p>}
            {erro && <p className="font-sans text-[13px] font-semibold text-vinho">{erro}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
