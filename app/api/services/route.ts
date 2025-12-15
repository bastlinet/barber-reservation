import { NextResponse } from "next/server";
import prisma from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const branchIdParam = url.searchParams.get("branchId");

  if (branchIdParam !== null) {
    const branchId = Number(branchIdParam);

    if (Number.isNaN(branchId)) {
      return NextResponse.json(
        { error: "branchId must be a valid number" },
        { status: 400 }
      );
    }

    const branchServices = await prisma.branchService.findMany({
      where: {
        branchId,
        active: true,
        service: { active: true }
      },
      include: { service: true }
    });

    const services = branchServices
      .map((bs) => ({
        branchId,
        serviceId: bs.serviceId,
        name: bs.service.name,
        category: bs.service.category,
        durationMin: bs.service.durationMin,
        priceCents: bs.priceCents
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ services });
  }

  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { name: "asc" }
  });

  return NextResponse.json({ services });
}
