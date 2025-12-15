"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

interface Branch {
  id: number;
  name: string;
}

interface Service {
  id: number;
  name: string;
  durationMin: number;
}

interface Staff {
  id: number;
  name: string;
  branchId: number;
  services: { serviceId: number }[];
}

export default function StaffPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);

  const [staffMessage, setStaffMessage] = useState<string | null>(null);
  const [shiftMessage, setShiftMessage] = useState<string | null>(null);
  const [timeOffMessage, setTimeOffMessage] = useState<string | null>(null);

  const loadLookups = async () => {
    const [branchesRes, servicesRes, staffRes] = await Promise.all([
      fetch("/api/branches"),
      fetch("/api/services"),
      fetch("/api/staff")
    ]);

    const [branchesBody, servicesBody, staffBody] = await Promise.all([
      branchesRes.json().catch(() => ({})),
      servicesRes.json().catch(() => ({})),
      staffRes.json().catch(() => ({}))
    ]);

    if (branchesRes.ok) {
      setBranches(branchesBody.branches ?? []);
    }
    if (servicesRes.ok) {
      setServices(servicesBody.services ?? []);
    }
    if (staffRes.ok) {
      setStaff(staffBody.staff ?? []);
    }
  };

  useEffect(() => {
    void loadLookups();
  }, []);

  const defaultBranchId = useMemo(() => branches[0]?.id, [branches]);
  const defaultStaffId = useMemo(() => staff[0]?.id, [staff]);

  const handleCreateStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const serviceIds = formData.getAll("serviceIds").map((value) => Number(value));
    const payload = {
      branchId: Number(formData.get("branchId")),
      name: String(formData.get("name") ?? ""),
      avatarUrl: formData.get("avatarUrl")
        ? String(formData.get("avatarUrl"))
        : undefined,
      serviceIds
    };

    setStaffMessage("Odesílám...");
    const response = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStaffMessage((body as { error?: string }).error ?? "Chyba");
      return;
    }

    setStaffMessage("Vytvořeno");
    form.reset();
    void loadLookups();
  };

  const handleShift = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      staffId: Number(formData.get("staffId")),
      branchId: Number(formData.get("branchId")),
      startAtUtc: new Date(String(formData.get("startAtUtc"))).toISOString(),
      endAtUtc: new Date(String(formData.get("endAtUtc"))).toISOString()
    };

    setShiftMessage("Ukládám...");
    const response = await fetch("/api/staff/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setShiftMessage((body as { error?: string }).error ?? "Chyba");
      return;
    }

    setShiftMessage("Uloženo");
    form.reset();
  };

  const handleTimeOff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      staffId: Number(formData.get("staffId")),
      startAtUtc: new Date(String(formData.get("startAtUtc"))).toISOString(),
      endAtUtc: new Date(String(formData.get("endAtUtc"))).toISOString(),
      reason: formData.get("reason") ? String(formData.get("reason")) : undefined
    };

    setTimeOffMessage("Ukládám...");
    const response = await fetch("/api/staff/time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setTimeOffMessage((body as { error?: string }).error ?? "Chyba");
      return;
    }

    setTimeOffMessage("Uloženo");
    form.reset();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h1 style={{ fontSize: "26px", marginBottom: "6px" }}>Personál & směny</h1>
        <p style={{ color: "#475569" }}>
          Přidej barbera, směny a time off. Časy zadávej v UTC (UI zatím nepřevádí timezone).
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px"
        }}
      >
        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "16px",
            background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
          }}
        >
          <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Nový člen</h2>
          <form
            onSubmit={handleCreateStaff}
            style={{ display: "grid", gap: "10px" }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Pobočka</span>
              <select name="branchId" defaultValue={defaultBranchId} required>
                <option value="">-- vyber --</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Jméno</span>
              <input name="name" type="text" defaultValue="Vojta Novák" required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Avatar URL</span>
              <input name="avatarUrl" type="url" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Služby (multi-select)</span>
              <select name="serviceIds" multiple size={Math.min(6, services.length || 3)}>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.durationMin} min)
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" style={{ marginTop: "4px" }}>
              Vytvořit
            </button>
          </form>
          <p aria-live="polite" style={{ color: "#475569", marginTop: "6px" }}>
            {staffMessage}
          </p>
        </section>

        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "16px",
            background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
          }}
        >
          <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Shift</h2>
          <form onSubmit={handleShift} style={{ display: "grid", gap: "10px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Staff</span>
              <select name="staffId" defaultValue={defaultStaffId ?? ""} required>
                <option value="">-- vyber --</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} (branch {member.branchId})
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Pobočka</span>
              <select name="branchId" defaultValue={defaultBranchId ?? ""} required>
                <option value="">-- vyber --</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Start (UTC)</span>
              <input name="startAtUtc" type="datetime-local" required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>End (UTC)</span>
              <input name="endAtUtc" type="datetime-local" required />
            </label>
            <button type="submit" style={{ marginTop: "4px" }}>
              Uložit
            </button>
          </form>
          <p aria-live="polite" style={{ color: "#475569", marginTop: "6px" }}>
            {shiftMessage}
          </p>
        </section>

        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "16px",
            background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
          }}
        >
          <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Time off</h2>
          <form onSubmit={handleTimeOff} style={{ display: "grid", gap: "10px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Staff</span>
              <select name="staffId" defaultValue={defaultStaffId ?? ""} required>
                <option value="">-- vyber --</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Start (UTC)</span>
              <input name="startAtUtc" type="datetime-local" required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>End (UTC)</span>
              <input name="endAtUtc" type="datetime-local" required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Důvod</span>
              <input name="reason" type="text" />
            </label>
            <button type="submit" style={{ marginTop: "4px" }}>
              Zaznamenat
            </button>
          </form>
          <p aria-live="polite" style={{ color: "#475569", marginTop: "6px" }}>
            {timeOffMessage}
          </p>
        </section>
      </div>

      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "16px",
          background: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
        }}
      >
        <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Přehled personálu</h2>
        <ul style={{ paddingLeft: "18px", color: "#0f172a" }}>
          {staff.map((member) => (
            <li key={member.id} style={{ marginBottom: "4px" }}>
              <strong>{member.name}</strong> — branch {member.branchId}, služby:{" "}
              {member.services.map((s) => s.serviceId).join(", ")}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
