import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../lib/db";
import { authOptions, isEmailAllowed } from "../../../../lib/auth/options";
import { serviceCreateSchema } from "../../../../lib/validation/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  if (!email || !isEmailAllowed(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = serviceCreateSchema.safeParse(json);

  if (!parsed.success) {
    const message = parsed.error.errors.map((issue) => issue.message).join(", ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const created = await prisma.service.create({
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        durationMin: parsed.data.durationMin,
        description: parsed.data.description
      }
    });

    return NextResponse.json({ service: created });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Service with this name already exists" },
        { status: 409 }
      );
    }

    console.error("Failed to create service", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
