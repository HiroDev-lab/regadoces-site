import { getSession } from "@/lib/auth";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Painel — Regadoces",
  robots: { index: false, follow: false },
};

/*
  Porteiro do painel: sem sessão válida, qualquer rota do painel mostra
  apenas a tela de login. (O middleware já esconde /admin — o painel só
  responde na URL secreta definida em ADMIN_SLUG.)
*/
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    return <AdminLogin />;
  }
  return <AdminShell email={session.email}>{children}</AdminShell>;
}
