import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../lib/db";
import { authOptions, isEmailAllowed } from "../../../../lib/auth/options";
import { branchCreateSchema } from "../../../../lib/validation/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  if (!email || !isEmailAllowed(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = branchCreateSchema.safeParse(json);

  if (!parsed.success) {
    const message = parsed.error.errors.map((issue) => issue.message).join(", ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const created = await prisma.branch.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        timezone: parsed.data.timezone,
        address: parsed.data.address,
        city: parsed.data.city,
        phone: parsed.data.phone,
        email: parsed.data.email,
        bookingBufferMin: parsed.data.bookingBufferMin ?? 10,
        slotStepMin: parsed.data.slotStepMin ?? 5,
        maxDaysAhead: parsed.data.maxDaysAhead ?? 60,
        allowPayOnSite: parsed.data.allowPayOnSite ?? true,
        allowPayOnline: parsed.data.allowPayOnline ?? true
      }
    });

    return NextResponse.json({
      branch: {
        id: created.id,
        name: created.name,
        slug: created.slug,
        timezone: created.timezone
      }
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      // Prisma unique constraint violation
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Branch with this slug already exists" },
        { status: 409 }
      );
    }

    console.error("Failed to create branch", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
