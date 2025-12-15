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

type StatusFilter = "ALL" | "CONFIRMED" | "NO_SHOW" | "CANCELLED";

export default function BookingsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [branchTimezone, setBranchTimezone] = useState<string | null>(null);
  const [bookingsMessage, setBookingsMessage] = useState<string | null>(null);
  const [noShowMessage, setNoShowMessage] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<number | "">("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  useEffect(() => {
    if (selectedBranchId === "" && branches[0]) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  const handleLoadBookings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBranchId || !selectedDate) {
      setBookingsMessage("Vyber pobočku a datum");
      return;
    }
    const branchId = Number(selectedBranchId);
    const date = selectedDate;

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

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesStatus =
        statusFilter === "ALL" || booking.status === statusFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        query.length === 0 ||
        booking.staffName.toLowerCase().includes(query) ||
        booking.serviceName.toLowerCase().includes(query) ||
        String(booking.id).includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [bookings, searchQuery, statusFilter]);

  const statusBadge = (status: string) => {
    const palette: Record<string, string> = {
      CONFIRMED: "#e7f8ef",
      NO_SHOW: "#ffecec",
      CANCELLED: "#f5f5f5"
    };
    const textPalette: Record<string, string> = {
      CONFIRMED: "#0f7a3d",
      NO_SHOW: "#c1121f",
      CANCELLED: "#444"
    };
    return {
      background: palette[status] ?? "#eef1ff",
      color: textPalette[status] ?? "#182a68",
      padding: "2px 8px",
      borderRadius: "12px",
      fontSize: "12px",
      fontWeight: 600,
      letterSpacing: "0.01em"
    };
  };

  const formatLocalTime = (iso: string) => {
    if (!branchTimezone) return iso;
    const date = new Date(iso);
    return new Intl.DateTimeFormat("cs-CZ", {
      timeZone: branchTimezone,
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };

  const formatLocalDay = (iso: string) => {
    if (!branchTimezone) return iso;
    const date = new Date(iso);
    return new Intl.DateTimeFormat("cs-CZ", {
      timeZone: branchTimezone,
      weekday: "short",
      day: "2-digit",
      month: "2-digit"
    }).format(date);
  };

  const quickSetDate = (offsetDays: number) => {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    setSelectedDate(target.toISOString().slice(0, 10));
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "12px" }}>Rezervace</h1>

      <section>
        <h2 style={{ fontSize: "20px", marginBottom: "10px" }}>Denní přehled</h2>
        <form
          onSubmit={handleLoadBookings}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto",
            gap: "12px",
            alignItems: "end",
            marginBottom: "12px"
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontWeight: 600 }}>Pobočka</span>
            <select
              name="branchId"
              value={selectedBranchId}
              onChange={(event) => setSelectedBranchId(Number(event.target.value))}
              required
            >
              <option value="">-- vyber --</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontWeight: 600 }}>Datum</span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <input
                name="date"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                required
              />
              <div style={{ display: "flex", gap: "4px" }}>
                <button type="button" onClick={() => quickSetDate(0)}>
                  dnes
                </button>
                <button type="button" onClick={() => quickSetDate(1)}>
                  zítra
                </button>
              </div>
            </div>
          </label>
          <button type="submit" style={{ height: "38px" }}>
            Načíst
          </button>
        </form>
        <p aria-live="polite" style={{ marginBottom: "8px" }}>
          {bookingsMessage}
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            marginBottom: "12px"
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontWeight: 600 }}>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="ALL">Vše</option>
              <option value="CONFIRMED">Potvrzené</option>
              <option value="NO_SHOW">No-show</option>
              <option value="CANCELLED">Zrušené</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
            <span style={{ fontWeight: 600 }}>Hledat (staff/služba/ID)</span>
            <input
              type="text"
              placeholder="např. Jan / Fade / 1024"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
        </div>

        {filteredBookings.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredBookings.map((booking) => (
              <div
                key={booking.id}
                style={{
                  border: "1px solid #e3e6ef",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  background: "#fff",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
                }}
              >
                <div style={{ minWidth: "88px" }}>
                  <div style={{ fontSize: "18px", fontWeight: 700 }}>
                    {formatLocalTime(booking.startAtUtc)}
                  </div>
                  <div
                    style={{ color: "#6b7280", fontSize: "12px" }}
                    title={`UTC ${booking.startAtUtc}`}
                  >
                    {formatLocalDay(booking.startAtUtc)}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{booking.staffName}</div>
                  <div style={{ color: "#4b5563" }}>{booking.serviceName}</div>
                  <div style={{ color: "#6b7280", fontSize: "12px" }}>ID {booking.id}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
                  <span style={statusBadge(booking.status)}>{booking.status}</span>
                  <span style={{ fontSize: "12px", color: "#374151" }}>
                    Platba: {booking.paymentStatus}
                  </span>
                  {booking.status !== "NO_SHOW" && (
                    <button
                      type="button"
                      onClick={() => markNoShow(booking.id)}
                      style={{
                        border: "1px solid #d1d5db",
                        background: "#fff",
                        padding: "6px 10px",
                        borderRadius: "10px",
                        cursor: "pointer"
                      }}
                    >
                      Označit no-show
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {bookings.length === 0 && (
          <p style={{ color: "#6b7280" }}>Pro vybraný den nejsou žádné rezervace.</p>
        )}

        <p aria-live="polite" style={{ marginTop: "10px" }}>
          {noShowMessage}
        </p>
      </section>
    </div>
  );
}
