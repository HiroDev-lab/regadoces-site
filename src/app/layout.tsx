import type { Metadata } from "next";
import { Chewy, Montserrat } from "next/font/google";
import { CartProvider } from "@/components/CartContext";
import MetricaBeacon from "@/components/MetricaBeacon";
import WhatsAppButton from "@/components/WhatsAppButton";
import "./globals.css";

/*
  Fontes:
  - Montserrat = "Textos e informações" (manual de marca)
  - Chewy = substituta web da "Lazy Arie" (logotipo e títulos), com suporte
    completo a acentos em português (latin-ext).
*/
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

/* O subset "latin" do Google Fonts inclui toda a acentuação do português. */
const chewy = Chewy({
  variable: "--font-chewy",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://regadoces.com.br"),
  title: "Regadoces — Doceria | 2019 - RJ",
  openGraph: {
    title: "Regadoces — Doceria | 2019 - RJ",
    description: "Regado + Doces = Regadoces! Bolos, tortas, brownies, pavês, pudins e outras sobremesas com muuuiiiito recheio.",
    siteName: "Regadoces",
    locale: "pt_BR",
    type: "website",
  },
  description:
    "Regado + Doces = Regadoces! Bolos, tortas, brownies, pavês, pudins e outras sobremesas com muuuiiiito recheio. E-commerce e encomendas para festas e eventos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${montserrat.variable} ${chewy.variable} antialiased`}>
        <CartProvider>{children}</CartProvider>
        <WhatsAppButton />
        <MetricaBeacon />
      </body>
    </html>
  );
}
