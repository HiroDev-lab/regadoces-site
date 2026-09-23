import Image from "next/image";
import Link from "next/link";

/* Rodapé padrão de todas as páginas (fundo creme). */
export default function SiteFooter() {
  return (
    <footer className="bg-creme px-6 pb-8 pt-14 text-marrom">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-[auto_1fr_auto_auto_auto]">
        <div className="flex justify-center md:block">
          <Image
            src="/images/brand/logo-blob-footer.png"
            alt="Regadoces 2019 - RJ"
            width={120}
            height={146}
            className="h-auto w-[120px] object-contain"
          />
        </div>

        <div className="max-w-sm">
          <div className="flex flex-col gap-3 font-sans text-[13px] leading-relaxed">
            <p>
              O Regadoces nasceu em outubro de 2019 com um propósito especial:
              despertar memórias afetivas por meio de doces saborosos, feitos
              com qualidade e cuidado.
            </p>
            <p>
              Desde a nossa inauguração, seguimos crescendo, criando novos
              produtos e buscando maneiras de tornar cada experiência ainda
              mais gostosa.
            </p>
            <p>
              Mais do que fazer doces, queremos fazer parte dos momentos que
              ficam na memória — uma comemoração, um presente, um encontro ou
              simplesmente aquele doce que transforma o dia.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-4">
            {/* Instagram */}
            <a href="https://instagram.com/regadoces" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="url(#ig)" strokeWidth="2">
                <defs>
                  <linearGradient id="ig" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f58529" />
                    <stop offset="50%" stopColor="#dd2a7b" />
                    <stop offset="100%" stopColor="#8134af" />
                  </linearGradient>
                </defs>
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r="1.4" fill="#dd2a7b" stroke="none" />
              </svg>
            </a>
            {/* TikTok */}
            <a href="https://tiktok.com/@regadoces" aria-label="TikTok" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#421a14">
                <path d="M16.6 3c.4 2.1 1.8 3.6 3.9 3.9v2.9c-1.5 0-2.8-.5-3.9-1.3v6.1c0 3.6-2.6 6.4-6.2 6.4A6.1 6.1 0 0 1 4.2 15c0-3.4 2.7-6.1 6.1-6.1.3 0 .7 0 1 .1v3a3.2 3.2 0 0 0-1-.2 3.2 3.2 0 1 0 3.2 3.2V3h3.1z" />
              </svg>
            </a>
            {/* WhatsApp */}
            <a href="https://wa.me/5541985222525" aria-label="WhatsApp" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#25D366">
                <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.4-3c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.2-.3.3-.5v-.5c0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.5-.3z" />
              </svg>
            </a>
          </div>
        </div>

        <FooterCol
          links={[
            { href: "/produtos", label: "Nossos produtos" },
            { href: "/cardapio-regadoces.pdf", label: "Cardápio", blank: true },
            { href: "/encomendas", label: "Encomenda" },
          ]}
        />
        <FooterCol
          links={[
            { href: "/sobre", label: "Sobre nós" },
            { href: "/depoimentos", label: "Avaliações" },
            { href: "/blog", label: "Na Mídia" },
          ]}
        />
        <FooterCol links={[{ href: "/#faq", label: "FAQ" }]} last />
      </div>

      <p className="mt-10 text-center font-sans text-[13px]">
        © 2026 Regadoces — Todos os direitos reservados&nbsp;&nbsp;|&nbsp;&nbsp;
        <Link href="#" className="hover:underline">
          Politica de privacidade
        </Link>
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <Link href="#" className="hover:underline">
          Termos de uso
        </Link>
      </p>
      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center font-sans text-[12.5px] text-marrom/85">
        <a
          href="https://www.behance.net/tuliohenrique1"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:underline hover:opacity-100"
        >
          Design UX e UI | Túlio Henrique
        </a>
        <span aria-hidden="true">·</span>
        <a
          href="https://github.com/HiroDev-lab"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:underline hover:opacity-100"
        >
          Desenvolvido por Hiro
        </a>
      </p>
    </footer>
  );
}

function FooterCol({
  links,
  last = false,
}: {
  links: { href: string; label: string; blank?: boolean }[];
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-6 md:border-l md:border-marrom/50 md:pl-8 ${
        last ? "" : "md:pr-4"
      }`}
    >
      {links.map((l) => (
        <Link
          key={l.label}
          href={l.href}
          target={l.blank ? "_blank" : undefined}
          rel={l.blank ? "noopener noreferrer" : undefined}
          className="font-sans text-lg font-medium hover:underline"
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
