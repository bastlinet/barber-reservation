"use client";

import { FormEvent, useState } from "react";

export default function AdminHomePage() {
  const [staffMessage, setStaffMessage] = useState<string | null>(null);
  const [shiftMessage, setShiftMessage] = useState<string | null>(null);
  const [timeOffMessage, setTimeOffMessage] = useState<string | null>(null);

  async function handleSubmit(
    path: string,
    payload: Record<string, unknown>,
    setMessage: (value: string | null) => void
  ) {
    setMessage("Odesílám...");

    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const message = (error as { message?: string }).message ?? response.statusText;
        throw new Error(message);
      }

      const data = await response.json();
      setMessage(`Hotovo (${JSON.stringify(data)})`);
    } catch (error) {
      setMessage(
        error instanceof Error ? `Chyba: ${error.message}` : "Neznámá chyba"
      );
    }
  }

  const handleStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const branchId = Number(formData.get("branchId"));
    const name = String(formData.get("name") ?? "");
    const avatarUrl = formData.get("avatarUrl")
      ? String(formData.get("avatarUrl"))
      : undefined;
    const serviceIdsRaw = String(formData.get("serviceIds") ?? "");
    const serviceIds = serviceIdsRaw
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value));

    handleSubmit("/api/staff", { branchId, name, avatarUrl, serviceIds }, setStaffMessage);
    form.reset();
  };

  const handleShift = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const staffId = Number(formData.get("staffId"));
    const branchId = Number(formData.get("branchId"));
    const startAtUtc = new Date(String(formData.get("startAtUtc"))).toISOString();
    const endAtUtc = new Date(String(formData.get("endAtUtc"))).toISOString();

    handleSubmit(
      "/api/staff/shifts",
      { staffId, branchId, startAtUtc, endAtUtc },
      setShiftMessage
    );
    form.reset();
  };

  const handleTimeOff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const staffId = Number(formData.get("staffId"));
    const startAtUtc = new Date(String(formData.get("startAtUtc"))).toISOString();
    const endAtUtc = new Date(String(formData.get("endAtUtc"))).toISOString();
    const reason = String(formData.get("reason") ?? "");

    handleSubmit(
      "/api/staff/time-off",
      { staffId, startAtUtc, endAtUtc, reason },
      setTimeOffMessage
    );
    form.reset();
  };

  return (
    <main>
      <h1>Admin</h1>
      <p>Google OAuth gate + dashboards coming soon.</p>
      <p>Adresář je nyní `app/admin`, takže v prohlížeči poběží na `/admin`.</p>

      <section>
        <h2>Vytvořit staff</h2>
        <form onSubmit={handleStaff}>
          <label>
            Branch ID
            <input name="branchId" type="number" defaultValue={1} required />
          </label>
          <label>
            Jméno
            <input name="name" type="text" defaultValue="Vojta Novák" required />
          </label>
          <label>
            Avatar URL
            <input name="avatarUrl" type="url" />
          </label>
          <label>
            Service IDs (comma-separated)
            <input name="serviceIds" type="text" defaultValue="1,2" required />
          </label>
          <button type="submit">Odeslat</button>
        </form>
        <p aria-live="polite">{staffMessage}</p>
      </section>

      <section>
        <h2>Shift</h2>
        <form onSubmit={handleShift}>
          <label>
            Staff ID
            <input name="staffId" type="number" defaultValue={1} required />
          </label>
          <label>
            Branch ID
            <input name="branchId" type="number" defaultValue={1} required />
          </label>
          <label>
            Start (UTC)
            <input name="startAtUtc" type="datetime-local" required />
          </label>
          <label>
            End (UTC)
            <input name="endAtUtc" type="datetime-local" required />
          </label>
          <button type="submit">Uložit shift</button>
        </form>
        <p aria-live="polite">{shiftMessage}</p>
      </section>

      <section>
        <h2>Time off</h2>
        <form onSubmit={handleTimeOff}>
          <label>
            Staff ID
            <input name="staffId" type="number" defaultValue={1} required />
          </label>
          <label>
            Start (UTC)
            <input name="startAtUtc" type="datetime-local" required />
          </label>
          <label>
            End (UTC)
            <input name="endAtUtc" type="datetime-local" required />
          </label>
          <label>
            Reason
            <input name="reason" type="text" />
          </label>
          <button type="submit">Zaznamenat</button>
        </form>
        <p aria-live="polite">{timeOffMessage}</p>
      </section>
    </main>
  );
}
