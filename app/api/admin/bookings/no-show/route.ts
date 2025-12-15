import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../lib/db";
import { authOptions, isEmailAllowed } from "../../../../../lib/auth/options";
import { bookingNoShowSchema } from "../../../../../lib/validation/booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeBooking(booking: {
  id: number;
  branchId: number;
  staffId: number;
  serviceId: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  note: string | null;
  startAtUtc: Date;
  endAtUtc: Date;
  status: string;
  paymentIntentId: string | null;
  paymentStatus: string;
}) {
  return {
    id: booking.id,
    branchId: booking.branchId,
    staffId: booking.staffId,
    serviceId: booking.serviceId,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    note: booking.note,
    startAtUtc: booking.startAtUtc.toISOString(),
    endAtUtc: booking.endAtUtc.toISOString(),
    status: booking.status,
    paymentIntentId: booking.paymentIntentId,
    paymentStatus: booking.paymentStatus
  };
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  if (!email || !isEmailAllowed(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = bookingNoShowSchema.safeParse(json);

  if (!parsed.success) {
    const message = parsed.error.errors.map((issue) => issue.message).join(", ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId }
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.status === "NO_SHOW") {
    return NextResponse.json({ booking: serializeBooking(booking) });
  }

  if (booking.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "Lze označit pouze potvrzené rezervace" },
      { status: 400 }
    );
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "NO_SHOW" }
  });

  return NextResponse.json({ booking: serializeBooking(updated) });
}
