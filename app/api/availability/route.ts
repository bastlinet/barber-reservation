import { availabilityQuerySchema } from "../../../lib/validation/availability";
import { listAvailableSlots, AvailabilityError } from "../../../lib/availability/engine";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = {
    branchId: url.searchParams.get("branchId") ?? undefined,
    serviceId: url.searchParams.get("serviceId") ?? undefined,
    staffId: url.searchParams.get("staffId") ?? undefined,
    date: url.searchParams.get("date") ?? undefined
  };

  const parseResult = availabilityQuerySchema.safeParse(query);

  if (!parseResult.success) {
    const message = parseResult.error.errors.map((item) => item.message).join(", ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const slots = await listAvailableSlots(parseResult.data);
    return NextResponse.json({ slots });
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to fetch availability", error);
    return NextResponse.json(
      { error: "Unable to load availability" },
      { status: 500 }
    );
  }
}
