import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../lib/db";
import { authOptions, isEmailAllowed } from "../../../../lib/auth/options";
import { branchServiceUpsertSchema } from "../../../../lib/validation/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  if (!email || !isEmailAllowed(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = branchServiceUpsertSchema.safeParse(json);

  if (!parsed.success) {
    const message = parsed.error.errors.map((issue) => issue.message).join(", ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const branch = await prisma.branch.findUnique({
    where: { id: parsed.data.branchId }
  });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const service = await prisma.service.findUnique({
    where: { id: parsed.data.serviceId, active: true }
  });
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const record = await prisma.branchService.upsert({
    where: {
      branchId_serviceId: {
        branchId: parsed.data.branchId,
        serviceId: parsed.data.serviceId
      }
    },
    update: {
      priceCents: parsed.data.priceCents,
      active: true
    },
    create: {
      branchId: parsed.data.branchId,
      serviceId: parsed.data.serviceId,
      priceCents: parsed.data.priceCents,
      active: true
    }
  });

  return NextResponse.json({ branchService: record });
}
