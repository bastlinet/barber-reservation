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
    <div>
      <h1>Pobočky & služby</h1>

      <section>
        <h2>Vytvořit pobočku</h2>
        <form onSubmit={handleCreateBranch}>
          <label>
            Název
            <input name="name" type="text" defaultValue="Centrum" required />
          </label>
          <label>
            Slug
            <input name="slug" type="text" defaultValue="centrum" required />
          </label>
          <label>
            Timezone
            <input name="timezone" type="text" defaultValue="Europe/Prague" required />
          </label>
          <label>
            Adresa
            <input name="address" type="text" />
          </label>
          <label>
            Město
            <input name="city" type="text" />
          </label>
          <label>
            Telefon
            <input name="phone" type="tel" />
          </label>
          <label>
            Email
            <input name="email" type="email" />
          </label>
          <button type="submit">Uložit</button>
        </form>
        <p aria-live="polite">{branchMessage}</p>
      </section>

      <section>
        <h2>Vytvořit službu</h2>
        <form onSubmit={handleCreateService}>
          <label>
            Název
            <input name="name" type="text" defaultValue="Střih" required />
          </label>
          <label>
            Kategorie
            <input name="category" type="text" defaultValue="Vlasy" required />
          </label>
          <label>
            Délka (min)
            <input name="durationMin" type="number" defaultValue={30} required />
          </label>
          <label>
            Popis
            <textarea name="description" rows={2} />
          </label>
          <button type="submit">Uložit</button>
        </form>
        <p aria-live="polite">{serviceMessage}</p>
      </section>

      <section>
        <h2>Napárovat službu na pobočku</h2>
        <form onSubmit={handlePrice}>
          <label>
            Pobočka
            <select name="branchId" defaultValue={defaultBranchId} required>
              <option value="">-- vyber --</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} (slug {branch.slug})
                </option>
              ))}
            </select>
          </label>
          <label>
            Služba
            <select name="serviceId" defaultValue={defaultServiceId} required>
              <option value="">-- vyber --</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.durationMin} min)
                </option>
              ))}
            </select>
          </label>
          <label>
            Cena (cents)
            <input name="priceCents" type="number" defaultValue={1500} required />
          </label>
          <button type="submit">Uložit</button>
        </form>
        <p aria-live="polite">{priceMessage}</p>
      </section>

      <section>
        <h2>Přehled</h2>
        <h3>Pobočky</h3>
        <ul>
          {branches.map((branch) => (
            <li key={branch.id}>
              {branch.id}: {branch.name} (slug {branch.slug}, tz {branch.timezone})
            </li>
          ))}
        </ul>
        <h3>Služby</h3>
        <ul>
          {services.map((service) => (
            <li key={service.id}>
              {service.id}: {service.name} ({service.category}, {service.durationMin} min)
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
