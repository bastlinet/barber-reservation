import { NextResponse } from "next/server";
import prisma from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    include: {
      services: {
        include: { service: true }
      }
    }
  });

  const payload = branches.map((branch) => ({
    id: branch.id,
    slug: branch.slug,
    name: branch.name,
    address: branch.address,
    city: branch.city,
    lat: branch.lat,
    lng: branch.lng,
    phone: branch.phone,
    email: branch.email,
    timezone: branch.timezone,
    bookingBufferMin: branch.bookingBufferMin,
    slotStepMin: branch.slotStepMin,
    maxDaysAhead: branch.maxDaysAhead,
    allowPayOnline: branch.allowPayOnline,
    allowPayOnSite: branch.allowPayOnSite,
    services: branch.services
      .filter((bs) => bs.active && bs.service.active)
      .map((bs) => ({
        serviceId: bs.serviceId,
        name: bs.service.name,
        category: bs.service.category,
        durationMin: bs.service.durationMin,
        priceCents: bs.priceCents
      }))
  }));

  return NextResponse.json({ branches: payload });
}
