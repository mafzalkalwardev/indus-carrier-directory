import { NextResponse } from "next/server";
import { normalizeDot } from "@/lib/format";
import { refreshCarrierFromQcMobile } from "@/lib/qcmobile";

export async function POST(_request: Request, context: { params: Promise<{ dot: string }> }) {
  const dot = normalizeDot((await context.params).dot);
  if (!dot) return NextResponse.json({ ok: false, error: "Missing DOT number." }, { status: 400 });
  try {
    const result = await refreshCarrierFromQcMobile(dot);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refresh failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
