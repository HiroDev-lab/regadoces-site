/*
  Botão flutuante do WhatsApp — aparece em todas as páginas, no canto
  inferior direito, e abre a conversa com a Regadoces já com uma mensagem
  inicial. O número vem de NEXT_PUBLIC_WHATSAPP (só dígitos, com 55 + DDD);
  se não estiver definido, usa o número das LPs.
*/
const NUMERO = process.env.NEXT_PUBLIC_WHATSAPP || "5541985222525";
const MENSAGEM = "Olá! Vim pelo site da Regadoces e quero fazer um pedido.";

export default function WhatsAppButton() {
  const href = `https://wa.me/${NUMERO}?text=${encodeURIComponent(MENSAGEM)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com a Regadoces no WhatsApp"
      className="group fixed bottom-5 right-5 z-[60] flex items-center gap-3 sm:bottom-7 sm:right-7"
    >
      {/* etiqueta que aparece ao passar o mouse */}
      <span className="pointer-events-none hidden rounded-full bg-marrom px-4 py-2 font-sans text-[13px] font-semibold text-creme opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 sm:block">
        Fale com a gente
      </span>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-transform duration-200 group-hover:scale-105 sm:h-[68px] sm:w-[68px]">
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="#ffffff" aria-hidden>
          <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.4-3c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.2-.3.3-.5v-.5c0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.5-.3z" />
        </svg>
      </span>
    </a>
  );
}
