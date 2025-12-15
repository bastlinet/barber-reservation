import { NextResponse } from "next/server";
import { BookingError, confirmBooking } from "../../../../lib/booking";
import { bookingConfirmSchema } from "../../../../lib/validation/booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = bookingConfirmSchema.safeParse(payload);

  if (!parsed.success) {
    const message = parsed.error.errors.map((item) => item.message).join(", ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const booking = await confirmBooking(parsed.data);
    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Nečekaná chyba při potvrzení booking", error);
    return NextResponse.json(
      { error: "Potvrzení selhalo" },
      { status: 500 }
    );
  }
}
