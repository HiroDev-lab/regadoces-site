import type { NextConfig } from "next";

/*
  Cabeçalhos de segurança globais (padrão e-commerce).
  Em produção, avalie trocar o CSP para nonces (removendo 'unsafe-inline')
  e ative HSTS no domínio final.
*/
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co",
      "connect-src 'self' https://viacep.com.br https://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Hospedagem Nuvem (cPanel + Passenger/Node 22): o site é empacotado como
  // "standalone" (server.js + só os módulos necessários) e enviado pronto,
  // porque o servidor tem pouca memória para rodar o build.
  output: "standalone",
  images: {
    // sem otimização no servidor (o binário do sharp é do Windows); as fotos
    // já são enviadas redimensionadas
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  async rewrites() {
    // URL bonita para as fotos enviadas pelo painel
    return [{ source: "/fotos/:nome", destination: "/api/uploads/:nome" }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
