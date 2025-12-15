"use client";

import { FormEvent, useState } from "react";

export default function PublicHomePage() {
  const [stepIndex, setStepIndex] = useState<number>(0);

  const [branchId, setBranchId] = useState<string>("1");
  const [serviceId, setServiceId] = useState<string>("1");
  const [staffId, setStaffId] = useState<string>("1");
  const [startAtLocal, setStartAtLocal] = useState<string>("");
  const [clientFingerprint, setClientFingerprint] = useState<string>("");
  const [holdId, setHoldId] = useState<number | null>(null);

  const [customerName, setCustomerName] = useState<string>("Testovací Zákazník");
  const [customerEmail, setCustomerEmail] = useState<string>("customer@example.com");
  const [customerPhone, setCustomerPhone] = useState<string>("+420123456789");
  const [note, setNote] = useState<string>("");

  const [holdMessage, setHoldMessage] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  const steps = [
    { title: "Pobočka", description: "Vyber, kde se střih odehraje." },
    { title: "Služba", description: "Délka a typ služby." },
    { title: "Barber", description: "Konkrétní barber nebo kdokoliv eligible." },
    { title: "Termín", description: "Zadej místní čas pobočky." },
    { title: "Kontakt", description: "Kdo přijde a jak ho zastihnout." },
    { title: "Shrnutí", description: "Založ hold a potvrď rezervaci." }
  ];

  const goTo = (index: number) => setStepIndex(Math.min(Math.max(index, 0), steps.length - 1));

  const handleHold = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!startAtLocal) {
      setHoldMessage("Vyber termín");
      return;
    }

    const startAtUtc = new Date(startAtLocal).toISOString();
    const payload = {
      branchId: Number(branchId),
      serviceId: Number(serviceId),
      staffId: Number(staffId),
      startAtUtc,
      clientFingerprint: clientFingerprint || undefined
    };

    setHoldMessage("Zakládám hold...");
    goTo(5);
    try {
      const response = await fetch("/api/booking/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((body as { error?: string }).error ?? "Chyba API");
      }

      setHoldId(body.hold?.id ?? null);
      setHoldMessage(`Hold #${body.hold?.id ?? "?"} vytvořen`);
    } catch (error) {
      setHoldMessage(
        error instanceof Error ? `Chyba: ${error.message}` : "Neznámá chyba"
      );
    }
  };

  const handleConfirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!holdId) {
      setConfirmMessage("Nejdřív založ hold");
      return;
    }

    const payload = {
      holdId: holdId,
      customerName,
      customerEmail,
      customerPhone,
      note
    };

    setConfirmMessage("Potvrzuji rezervaci...");
    try {
      const response = await fetch("/api/booking/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((body as { error?: string }).error ?? "Chyba API");
      }

      setConfirmMessage(`Booking potvrzen: ${JSON.stringify(body.booking)}`);
    } catch (error) {
      setConfirmMessage(
        error instanceof Error ? `Chyba: ${error.message}` : "Neznámá chyba"
      );
    }
  };

  return (
    <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>Barber Reservations</h1>
      <p style={{ color: "#4b5563", marginBottom: "16px" }}>
        Wizard pro veřejný booking: projdi kroky, založ hold a potvrď. Čas zadávej v místním
        čase pobočky; do API posíláme UTC.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 320px", gap: "16px" }}>
        <aside
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "14px",
            background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            height: "fit-content"
          }}
        >
          <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>Kroky</h3>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
            {steps.map((step, index) => {
              const isActive = index === stepIndex;
              const isDone = index < stepIndex;
              return (
                <li
                  key={step.title}
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    cursor: "pointer",
                    padding: "8px",
                    borderRadius: "10px",
                    background: isActive ? "#eef2ff" : isDone ? "#f9fafb" : "transparent",
                    border: isActive ? "1px solid #c7d2fe" : "1px solid transparent"
                  }}
                  onClick={() => goTo(index)}
                >
                  <span
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isDone ? "#10b981" : "#e5e7eb",
                      color: isDone ? "#fff" : "#111827",
                      fontWeight: 700,
                      fontSize: "12px"
                    }}
                  >
                    {isDone ? "✓" : index + 1}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 700 }}>{step.title}</span>
                    <span style={{ color: "#6b7280", fontSize: "12px" }}>{step.description}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </aside>

        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px",
            background: "#fff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
            minHeight: "520px"
          }}
        >
          {stepIndex === 0 && (
            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <h2 style={{ fontSize: "20px", marginBottom: "6px" }}>Pobočka</h2>
                <p style={{ color: "#6b7280" }}>Zadej ID pobočky (API /api/branches pro seznam).</p>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "280px" }}>
                <span style={{ fontWeight: 600 }}>Pobočka (ID)</span>
                <input
                  type="number"
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                  required
                />
              </label>
            </div>
          )}

          {stepIndex === 1 && (
            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <h2 style={{ fontSize: "20px", marginBottom: "6px" }}>Služba</h2>
                <p style={{ color: "#6b7280" }}>
                  Zadej ID služby; pro dostupné služby použij API /api/branches/:id/services.
                </p>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "280px" }}>
                <span style={{ fontWeight: 600 }}>Služba (ID)</span>
                <input
                  type="number"
                  value={serviceId}
                  onChange={(event) => setServiceId(event.target.value)}
                  required
                />
              </label>
            </div>
          )}

          {stepIndex === 2 && (
            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <h2 style={{ fontSize: "20px", marginBottom: "6px" }}>Barber</h2>
                <p style={{ color: "#6b7280" }}>
                  Zadej konkrétní ID barbera; “kdokoliv” = zvol barbera, který je eligible pro službu.
                </p>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "280px" }}>
                <span style={{ fontWeight: 600 }}>Barber (ID)</span>
                <input
                  type="number"
                  value={staffId}
                  onChange={(event) => setStaffId(event.target.value)}
                  required
                />
              </label>
            </div>
          )}

          {stepIndex === 3 && (
            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <h2 style={{ fontSize: "20px", marginBottom: "6px" }}>Termín</h2>
                <p style={{ color: "#6b7280" }}>
                  Zadávej místní čas pobočky. Převádíme na UTC při odeslání na API.
                </p>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "320px" }}>
                <span style={{ fontWeight: 600 }}>Začátek (local datetime)</span>
                <input
                  type="datetime-local"
                  value={startAtLocal}
                  onChange={(event) => setStartAtLocal(event.target.value)}
                  required
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "320px" }}>
                <span style={{ fontWeight: 600 }}>Client fingerprint (volitelné)</span>
                <input
                  type="text"
                  value={clientFingerprint}
                  onChange={(event) => setClientFingerprint(event.target.value)}
                  placeholder="např. session-123"
                />
              </label>
            </div>
          )}

          {stepIndex === 4 && (
            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <h2 style={{ fontSize: "20px", marginBottom: "6px" }}>Kontakt</h2>
                <p style={{ color: "#6b7280" }}>Kdo přijde a jak ho zastihnout.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "10px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontWeight: 600 }}>Jméno</span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    required
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontWeight: 600 }}>Email</span>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontWeight: 600 }}>Telefon</span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontWeight: 600 }}>Poznámka</span>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
              </div>
            </div>
          )}

          {stepIndex === 5 && (
            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <h2 style={{ fontSize: "20px", marginBottom: "6px" }}>Shrnutí</h2>
                <p style={{ color: "#6b7280" }}>
                  Nejprve vytvoř hold, pak potvrď rezervaci. Hold ID se propíše automaticky.
                </p>
              </div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px", background: "#f9fafb" }}>
                <div style={{ display: "grid", rowGap: "6px" }}>
                  <div>
                    <strong>Pobočka:</strong> {branchId || "—"}
                  </div>
                  <div>
                    <strong>Služba:</strong> {serviceId || "—"}
                  </div>
                  <div>
                    <strong>Barber:</strong> {staffId || "—"}
                  </div>
                  <div>
                    <strong>Začátek (local):</strong> {startAtLocal || "—"}
                  </div>
                  <div>
                    <strong>Hold ID:</strong> {holdId ?? "—"}
                  </div>
                  <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "6px" }}>
                    <div>
                      <strong>Jméno:</strong> {customerName || "—"}
                    </div>
                    <div>
                      <strong>Kontakt:</strong> {customerEmail || customerPhone || "—"}
                    </div>
                  </div>
                </div>
              </div>
              <form onSubmit={handleHold}>
                <button type="submit" style={{ width: "100%" }}>
                  1) Založit hold
                </button>
              </form>
              <form onSubmit={handleConfirm} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="number"
                  value={holdId ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setHoldId(value ? Number(value) : null);
                  }}
                  placeholder="Hold ID"
                  required
                  style={{ width: "120px" }}
                />
                <button type="submit" style={{ flex: 1 }}>
                  2) Potvrdit rezervaci
                </button>
              </form>
              <div style={{ color: "#6b7280", fontSize: "12px" }}>
                Další: voucher pole + volba platby, slot grid propojený s /api/availability.
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
            <button
              type="button"
              onClick={() => goTo(stepIndex - 1)}
              disabled={stepIndex === 0}
              style={{ opacity: stepIndex === 0 ? 0.6 : 1 }}
            >
              ← Zpět
            </button>
            <button
              type="button"
              onClick={() => goTo(stepIndex + 1)}
              disabled={stepIndex === steps.length - 1}
              style={{ opacity: stepIndex === steps.length - 1 ? 0.6 : 1 }}
            >
              Další →
            </button>
          </div>
        </section>

        <aside
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "14px",
            background: "#fafafa",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            position: "sticky",
            top: "20px",
            height: "fit-content"
          }}
        >
          <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>Stav akcí</h3>
          <p aria-live="polite" style={{ minHeight: "20px" }}>
            {holdMessage}
          </p>
          <p aria-live="polite" style={{ minHeight: "20px" }}>
            {confirmMessage}
          </p>
          <div style={{ marginTop: "10px", color: "#6b7280", fontSize: "12px" }}>
            Tip: přeskakovat kroky můžeš přes levý panel; Shrnutí se aktivuje po založení holdu.
            Tohle je UX mock, slot grid a platby přidáme později.
          </div>
        </aside>
      </div>
    </main>
  );
}
