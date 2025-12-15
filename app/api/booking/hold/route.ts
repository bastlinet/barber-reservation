import { NextResponse } from "next/server";
import { createBookingHold, BookingError } from "../../../../lib/booking";
import { bookingHoldSchema } from "../../../../lib/validation/booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = bookingHoldSchema.safeParse(payload);

  if (!parsed.success) {
    const message = parsed.error.errors.map((item) => item.message).join(", ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const hold = await createBookingHold(parsed.data);
    return NextResponse.json({ hold }, { status: 201 });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Nečekaná chyba při vytváření hold", error);
    return NextResponse.json(
      { error: "Hold se nepodařilo vytvořit" },
      { status: 500 }
    );
  }
}
