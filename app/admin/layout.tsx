import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions, isEmailAllowed } from "../../lib/auth/options";

export default async function AdminLayout({
  children
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  if (!email || !isEmailAllowed(email)) {
    redirect("/api/auth/signin?callbackUrl=/admin");
  }

  return (
    <div style={{ padding: "24px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <header style={{ marginBottom: "16px", display: "flex", gap: "12px" }}>
        <strong>Admin</strong>
        <a href="/admin/branches">Pobočky & služby</a>
        <a href="/admin/staff">Personál & směny</a>
        <a href="/admin/bookings">Rezervace</a>
      </header>
      <main>{children}</main>
    </div>
  );
}
