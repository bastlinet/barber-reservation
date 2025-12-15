"use client";

import { FormEvent, useState } from "react";

export default function PublicHomePage() {
  const [holdMessage, setHoldMessage] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  const handleHold = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      branchId: Number(formData.get("branchId")),
      serviceId: Number(formData.get("serviceId")),
      staffId: Number(formData.get("staffId")),
      startAtUtc: new Date(String(formData.get("startAtUtc"))).toISOString(),
      clientFingerprint: formData.get("clientFingerprint")
        ? String(formData.get("clientFingerprint"))
        : undefined
    };

    setHoldMessage("Zakládám hold...");
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

      setHoldMessage(`Hold vytvořen: ${JSON.stringify(body.hold)}`);
    } catch (error) {
      setHoldMessage(
        error instanceof Error ? `Chyba: ${error.message}` : "Neznámá chyba"
      );
    }

    form.reset();
  };

  const handleConfirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      holdId: Number(formData.get("holdId")),
      customerName: String(formData.get("customerName") ?? ""),
      customerEmail: String(formData.get("customerEmail") ?? ""),
      customerPhone: String(formData.get("customerPhone") ?? ""),
      note: String(formData.get("note") ?? "")
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

    form.reset();
  };

  return (
    <main>
      <h1>Barber Reservations</h1>
      <p>Public booking flow (bez plateb) – jednoduchý playground pro hold a potvrzení.</p>

      <section>
        <h2>Krok 1: vytvoř hold</h2>
        <form onSubmit={handleHold}>
          <label>
            Branch ID
            <input name="branchId" type="number" defaultValue={1} required />
          </label>
          <label>
            Service ID
            <input name="serviceId" type="number" defaultValue={1} required />
          </label>
          <label>
            Staff ID
            <input name="staffId" type="number" defaultValue={1} required />
          </label>
          <label>
            Start (UTC)
            <input name="startAtUtc" type="datetime-local" required />
          </label>
          <label>
            Client fingerprint (optional)
            <input name="clientFingerprint" type="text" />
          </label>
          <button type="submit">Vytvořit hold</button>
        </form>
        <p aria-live="polite">{holdMessage}</p>
      </section>

      <section>
        <h2>Krok 2: potvrď booking</h2>
        <form onSubmit={handleConfirm}>
          <label>
            Hold ID
            <input name="holdId" type="number" required />
          </label>
          <label>
            Jméno
            <input name="customerName" type="text" defaultValue="Testovací Zákazník" required />
          </label>
          <label>
            Email
            <input name="customerEmail" type="email" defaultValue="customer@example.com" />
          </label>
          <label>
            Telefon
            <input name="customerPhone" type="tel" defaultValue="+420123456789" />
          </label>
          <label>
            Poznámka
            <textarea name="note" rows={3} />
          </label>
          <button type="submit">Potvrdit rezervaci</button>
        </form>
        <p aria-live="polite">{confirmMessage}</p>
      </section>
    </main>
  );
}
