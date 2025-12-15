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
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#0f172a"
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(8px)",
          background: "rgba(255,255,255,0.8)",
          borderBottom: "1px solid #e2e8f0"
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: "16px"
          }}
        >
          <div style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>Admin</div>
          <nav style={{ display: "flex", gap: "12px", fontWeight: 600 }}>
            <a href="/admin/branches" style={{ color: "#111827" }}>
              Pobočky & služby
            </a>
            <a href="/admin/staff" style={{ color: "#111827" }}>
              Personál & směny
            </a>
            <a href="/admin/bookings" style={{ color: "#111827" }}>
              Rezervace
            </a>
          </nav>
          <div style={{ marginLeft: "auto", fontSize: "14px", color: "#475569" }}>
            {email}
          </div>
        </div>
      </header>
      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}
      >
        {children}
      </main>
    </div>
  );
}
