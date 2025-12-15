"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

interface Branch {
  id: number;
  name: string;
  timezone: string;
}

interface BookingRow {
  id: number;
  staffId: number;
  staffName: string;
  serviceName: string;
  startAtUtc: string;
  status: string;
  paymentStatus: string;
}

export default function BookingsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [branchTimezone, setBranchTimezone] = useState<string | null>(null);
  const [bookingsMessage, setBookingsMessage] = useState<string | null>(null);
  const [noShowMessage, setNoShowMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadBranches();
  }, []);

  const loadBranches = async () => {
    const response = await fetch("/api/branches");
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      setBranches(body.branches ?? []);
    }
  };

  const defaultBranchId = useMemo(() => branches[0]?.id ?? "", [branches]);

  const handleLoadBookings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const branchId = Number(formData.get("branchId"));
    const date = String(formData.get("date") ?? "");

    setBookingsMessage("Načítám...");
    const response = await fetch(
      `/api/admin/bookings?branchId=${branchId}&date=${encodeURIComponent(date)}`
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setBookings([]);
      setBranchTimezone(null);
      setBookingsMessage((body as { error?: string }).error ?? "Chyba");
      return;
    }

    setBookings(body.bookings ?? []);
    setBranchTimezone(body.branch?.timezone ?? null);
    setBookingsMessage(`Načteno ${body.bookings?.length ?? 0} záznamů`);
  };

  const formatLocalTime = (iso: string) => {
    if (!branchTimezone) return iso;
    const date = new Date(iso);
    return new Intl.DateTimeFormat("cs-CZ", {
      timeZone: branchTimezone,
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
  };

  const markNoShow = async (bookingId: number) => {
    setNoShowMessage(`Označuji ${bookingId}...`);
    const response = await fetch("/api/admin/bookings/no-show", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNoShowMessage((body as { error?: string }).error ?? "Chyba");
      return;
    }

    setBookings((current) =>
      current.map((row) =>
        row.id === bookingId ? { ...row, status: "NO_SHOW" } : row
      )
    );
    setNoShowMessage("Označeno");
  };

  return (
    <div>
      <h1>Rezervace</h1>

      <section>
        <h2>Denní přehled</h2>
        <form onSubmit={handleLoadBookings}>
          <label>
            Pobočka
            <select name="branchId" defaultValue={defaultBranchId} required>
              <option value="">-- vyber --</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Datum
            <input
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </label>
          <button type="submit">Načíst</button>
        </form>
        <p aria-live="polite">{bookingsMessage}</p>

        {bookings.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Čas</th>
                <th>Staff</th>
                <th>Služba</th>
                <th>Status</th>
                <th>Platba</th>
                <th>Akce</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.id}</td>
                  <td>
                    <div>{formatLocalTime(booking.startAtUtc)}</div>
                    <div style={{ color: "#777", fontSize: "0.85em" }}>
                      UTC: {booking.startAtUtc}
                    </div>
                  </td>
                  <td>{booking.staffName}</td>
                  <td>{booking.serviceName}</td>
                  <td>{booking.status}</td>
                  <td>{booking.paymentStatus}</td>
                  <td>
                    {booking.status !== "NO_SHOW" && (
                      <button type="button" onClick={() => markNoShow(booking.id)}>
                        No-show
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p aria-live="polite">{noShowMessage}</p>
      </section>
    </div>
  );
}
