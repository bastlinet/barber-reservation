import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "../../../../lib/db";
import { authOptions, isEmailAllowed } from "../../../../lib/auth/options";
import { toDate } from "date-fns-tz/toDate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  branchId: z
    .string()
    .transform((value) => Number(value))
    .refine((value) => Number.isInteger(value) && value > 0, {
      message: "branchId must be a positive integer"
    }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  if (!email || !isEmailAllowed(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries())
  );

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

  const startUtc = toDate(`${parsed.data.date}T00:00:00`, {
    timeZone: branch.timezone
  });
  const endUtc = toDate(`${parsed.data.date}T23:59:59.999`, {
    timeZone: branch.timezone
  });

  const bookings = await prisma.booking.findMany({
    where: {
      branchId: branch.id,
      startAtUtc: { gte: startUtc, lte: endUtc }
    },
    include: {
      staff: true,
      service: true
    },
    orderBy: { startAtUtc: "asc" }
  });

  const serialized = bookings.map((booking) => ({
    id: booking.id,
    branchId: booking.branchId,
    staffId: booking.staffId,
    staffName: booking.staff.name,
    serviceId: booking.serviceId,
    serviceName: booking.service.name,
    customerName: booking.customerName,
    startAtUtc: booking.startAtUtc.toISOString(),
    endAtUtc: booking.endAtUtc.toISOString(),
    status: booking.status,
    paymentStatus: booking.paymentStatus
  }));

  return NextResponse.json({
    branch: {
      id: branch.id,
      name: branch.name,
      timezone: branch.timezone
    },
    bookings: serialized
  });
}
