import { staffCreateSchema } from "../../../lib/validation/staff";
import { NextResponse } from "next/server";
import prisma from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const branchIdParam = url.searchParams.get("branchId");

  const whereClause: { branchId?: number; active: boolean } = {
    active: true
  };

  if (branchIdParam) {
    const branchId = Number(branchIdParam);

    if (Number.isNaN(branchId)) {
      return NextResponse.json(
        { error: "branchId musí být číslo" },
        { status: 400 }
      );
    }

    whereClause.branchId = branchId;
  }

  const staff = await prisma.staff.findMany({
    where: whereClause,
    orderBy: { name: "asc" },
    include: {
      services: {
        where: { active: true },
        include: { service: true }
      }
    }
  });

  const payload = staff.map((member) => ({
    id: member.id,
    name: member.name,
    avatarUrl: member.avatarUrl,
    branchId: member.branchId,
    services: member.services.map((rel) => ({
      serviceId: rel.serviceId,
      name: rel.service.name,
      durationMin: rel.service.durationMin,
      category: rel.service.category
    }))
  }));

  return NextResponse.json({ staff: payload });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const result = staffCreateSchema.parse(payload);
  const uniqueServiceIds = Array.from(new Set(result.serviceIds));

  const staff = await prisma.staff.create({
    data: {
      branchId: result.branchId,
      name: result.name,
      avatarUrl: result.avatarUrl,
      services: {
        createMany: {
          data: uniqueServiceIds.map((serviceId) => ({
            serviceId
          }))
        }
      }
    },
    include: {
      services: {
        include: {
          service: true
        }
      }
    }
  });

  return NextResponse.json({ staff }, { status: 201 });
}
