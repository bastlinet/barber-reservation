import { NextResponse } from "next/server";
import prisma from "../../../../lib/db";
import { timeOffSchema } from "../../../../lib/validation/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.json();
  const result = timeOffSchema.parse(payload);

  const timeOff = await prisma.timeOff.create({
    data: {
      staffId: result.staffId,
      startAtUtc: new Date(result.startAtUtc),
      endAtUtc: new Date(result.endAtUtc),
      reason: result.reason
    }
  });

  return NextResponse.json({ timeOff }, { status: 201 });
}
