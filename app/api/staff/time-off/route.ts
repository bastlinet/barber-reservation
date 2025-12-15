import { NextResponse } from "next/server";
import prisma from "../../../../lib/db";
import { timeOffSchema } from "../../../../lib/validation/schedule";
import { getServerSession } from "next-auth";
import { authOptions, isEmailAllowed } from "../../../../lib/auth/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  if (!email || !isEmailAllowed(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
