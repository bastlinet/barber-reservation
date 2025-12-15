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
    <div>
      <h1>Personál & směny</h1>

      <section>
        <h2>Nový člen</h2>
        <form onSubmit={handleCreateStaff}>
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
            Jméno
            <input name="name" type="text" defaultValue="Vojta Novák" required />
          </label>
          <label>
            Avatar URL
            <input name="avatarUrl" type="url" />
          </label>
          <label>
            Služby (drž Cmd/Alt pro multi-select)
            <select name="serviceIds" multiple size={Math.min(6, services.length || 3)}>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.durationMin} min)
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Vytvořit</button>
        </form>
        <p aria-live="polite">{staffMessage}</p>
      </section>

      <section>
        <h2>Shift</h2>
        <form onSubmit={handleShift}>
          <label>
            Staff
            <select name="staffId" defaultValue={defaultStaffId ?? ""} required>
              <option value="">-- vyber --</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} (branch {member.branchId})
                </option>
              ))}
            </select>
          </label>
          <label>
            Pobočka
            <select name="branchId" defaultValue={defaultBranchId ?? ""} required>
              <option value="">-- vyber --</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Start (UTC)
            <input name="startAtUtc" type="datetime-local" required />
          </label>
          <label>
            End (UTC)
            <input name="endAtUtc" type="datetime-local" required />
          </label>
          <button type="submit">Uložit</button>
        </form>
        <p aria-live="polite">{shiftMessage}</p>
      </section>

      <section>
        <h2>Time off</h2>
        <form onSubmit={handleTimeOff}>
          <label>
            Staff
            <select name="staffId" defaultValue={defaultStaffId ?? ""} required>
              <option value="">-- vyber --</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
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
            Důvod
            <input name="reason" type="text" />
          </label>
          <button type="submit">Zaznamenat</button>
        </form>
        <p aria-live="polite">{timeOffMessage}</p>
      </section>

      <section>
        <h2>Přehled personálu</h2>
        <ul>
          {staff.map((member) => (
            <li key={member.id}>
              {member.id}: {member.name} (branch {member.branchId}) — služby:{" "}
              {member.services.map((s) => s.serviceId).join(", ")}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
