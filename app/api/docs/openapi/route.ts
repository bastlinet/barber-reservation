import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const specPath = path.join(process.cwd(), "docs", "openapi.yaml");

export async function GET() {
  try {
    const spec = await fs.readFile(specPath, "utf-8");
    return new NextResponse(spec, {
      headers: {
        "Content-Type": "application/yaml; charset=utf-8"
      }
    });
  } catch (error) {
    console.error("Failed to load OpenAPI spec", error);
    return NextResponse.json(
      { error: "Unable to load API documentation" },
      { status: 500 }
    );
  }
}
