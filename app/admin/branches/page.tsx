"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

interface Branch {
  id: number;
  name: string;
  slug: string;
  timezone: string;
}

interface Service {
  id: number;
  name: string;
  category: string;
  durationMin: number;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [branchMessage, setBranchMessage] = useState<string | null>(null);
  const [serviceMessage, setServiceMessage] = useState<string | null>(null);
  const [priceMessage, setPriceMessage] = useState<string | null>(null);

  const fetchLookups = async () => {
    const [branchesRes, servicesRes] = await Promise.all([
      fetch("/api/branches"),
      fetch("/api/services")
    ]);
    const [branchesBody, servicesBody] = await Promise.all([
      branchesRes.json().catch(() => ({})),
      servicesRes.json().catch(() => ({}))
    ]);

    if (branchesRes.ok && Array.isArray(branchesBody.branches)) {
      setBranches(
        branchesBody.branches.map(
          (branch: Branch) =>
            ({
              id: branch.id,
              name: branch.name,
              slug: branch.slug,
              timezone: branch.timezone
            }) satisfies Branch
        )
      );
    }

    if (servicesRes.ok && Array.isArray(servicesBody.services)) {
      setServices(
        servicesBody.services.map(
          (service: Service) =>
            ({
              id: service.id,
              name: service.name,
              category: service.category,
              durationMin: service.durationMin
            }) satisfies Service
        )
      );
    }
  };

  useEffect(() => {
    void fetchLookups();
  }, []);

  const handleCreateBranch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      timezone: String(formData.get("timezone") ?? ""),
      address: formData.get("address")
        ? String(formData.get("address"))
        : undefined,
      city: formData.get("city") ? String(formData.get("city")) : undefined,
      phone: formData.get("phone") ? String(formData.get("phone")) : undefined,
      email: formData.get("email") ? String(formData.get("email")) : undefined
    };

    setBranchMessage("Odesílám...");
    const response = await fetch("/api/admin/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setBranchMessage((body as { error?: string }).error ?? "Chyba");
      return;
    }

    setBranchMessage("Vytvořeno");
    form.reset();
    void fetchLookups();
  };

  const handleCreateService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") ?? ""),
      category: String(formData.get("category") ?? ""),
      durationMin: Number(formData.get("durationMin")),
      description: formData.get("description")
        ? String(formData.get("description"))
        : undefined
    };

    setServiceMessage("Odesílám...");
    const response = await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setServiceMessage((body as { error?: string }).error ?? "Chyba");
      return;
    }

    setServiceMessage("Vytvořeno");
    form.reset();
    void fetchLookups();
  };

  const handlePrice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      branchId: Number(formData.get("branchId")),
      serviceId: Number(formData.get("serviceId")),
      priceCents: Number(formData.get("priceCents"))
    };

    setPriceMessage("Ukládám...");
    const response = await fetch("/api/admin/branch-services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPriceMessage((body as { error?: string }).error ?? "Chyba");
      return;
    }

    setPriceMessage("Uloženo");
    form.reset();
  };

  const defaultBranchId = useMemo(() => branches[0]?.id, [branches]);
  const defaultServiceId = useMemo(() => services[0]?.id, [services]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h1 style={{ fontSize: "26px", marginBottom: "6px" }}>Pobočky & služby</h1>
        <p style={{ color: "#475569" }}>
          CRUD pro pobočky, služby a pricing per pobočka. Vstupy jsou kontrolované jen minimálně.
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
          <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Vytvořit pobočku</h2>
          <form
            onSubmit={handleCreateBranch}
            style={{ display: "grid", gap: "10px" }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Název</span>
              <input name="name" type="text" defaultValue="Centrum" required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Slug</span>
              <input name="slug" type="text" defaultValue="centrum" required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Timezone</span>
              <input name="timezone" type="text" defaultValue="Europe/Prague" required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Adresa</span>
              <input name="address" type="text" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Město</span>
              <input name="city" type="text" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Telefon</span>
              <input name="phone" type="tel" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Email</span>
              <input name="email" type="email" />
            </label>
            <button type="submit" style={{ marginTop: "4px" }}>
              Uložit
            </button>
          </form>
          <p aria-live="polite" style={{ color: "#475569", marginTop: "6px" }}>
            {branchMessage}
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
          <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Vytvořit službu</h2>
          <form
            onSubmit={handleCreateService}
            style={{ display: "grid", gap: "10px" }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Název</span>
              <input name="name" type="text" defaultValue="Střih" required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Kategorie</span>
              <input name="category" type="text" defaultValue="Vlasy" required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Délka (min)</span>
              <input name="durationMin" type="number" defaultValue={30} required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Popis</span>
              <textarea name="description" rows={2} />
            </label>
            <button type="submit" style={{ marginTop: "4px" }}>
              Uložit
            </button>
          </form>
          <p aria-live="polite" style={{ color: "#475569", marginTop: "6px" }}>
            {serviceMessage}
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
          <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Napárovat službu na pobočku</h2>
          <form
            onSubmit={handlePrice}
            style={{ display: "grid", gap: "10px" }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Pobočka</span>
              <select name="branchId" defaultValue={defaultBranchId} required>
                <option value="">-- vyber --</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} (slug {branch.slug})
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Služba</span>
              <select name="serviceId" defaultValue={defaultServiceId} required>
                <option value="">-- vyber --</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.durationMin} min)
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Cena (cents)</span>
              <input name="priceCents" type="number" defaultValue={1500} required />
            </label>
            <button type="submit" style={{ marginTop: "4px" }}>
              Uložit
            </button>
          </form>
          <p aria-live="polite" style={{ color: "#475569", marginTop: "6px" }}>
            {priceMessage}
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
        <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Přehled</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "12px"
          }}
        >
          <div>
            <h3 style={{ fontSize: "14px", textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.04em" }}>
              Pobočky
            </h3>
            <ul style={{ marginTop: "8px", paddingLeft: "18px", color: "#0f172a" }}>
              {branches.map((branch) => (
                <li key={branch.id}>
                  <strong>{branch.name}</strong> — slug {branch.slug}, tz {branch.timezone}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: "14px", textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.04em" }}>
              Služby
            </h3>
            <ul style={{ marginTop: "8px", paddingLeft: "18px", color: "#0f172a" }}>
              {services.map((service) => (
                <li key={service.id}>
                  <strong>{service.name}</strong> — {service.category}, {service.durationMin} min
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
