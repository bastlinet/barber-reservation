import { NextResponse } from "next/server";
import prisma from "../../../../lib/db";
import { shiftSchema } from "../../../../lib/validation/schedule";
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
  const result = shiftSchema.parse(payload);

  const shift = await prisma.shift.create({
    data: {
      staffId: result.staffId,
      branchId: result.branchId,
      startAtUtc: new Date(result.startAtUtc),
      endAtUtc: new Date(result.endAtUtc)
    }
  });

  return NextResponse.json({ shift }, { status: 201 });
}
