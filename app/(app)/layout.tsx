import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Belt-and-suspenders with middleware.ts: the middleware handles the
  // common case at the edge, this handles it if a layout is ever reached
  // through a path the middleware matcher doesn't cover.
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
