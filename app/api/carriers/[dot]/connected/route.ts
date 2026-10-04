import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { normalizeDot } from "@/lib/format";

export async function GET(_request: Request, context: { params: Promise<{ dot: string }> }) {
  const dot = normalizeDot((await context.params).dot);
  if (!dot) return NextResponse.json({ error: "Missing DOT number." }, { status: 400 });

  const self = await query<{ phone_digits: string | null; email: string | null }>(
    `SELECT phone_digits, email FROM carriers WHERE dot_number = $1`,
    [dot],
  );
  const carrier = self[0];
  if (!carrier) return NextResponse.json({ error: "Carrier not found." }, { status: 404 });

  const phone = carrier.phone_digits;
  const email = carrier.email?.trim().toLowerCase() ?? "";
  if (!phone && !email) return NextResponse.json({ carriers: [] });

  const rows = await query<{
    dot_number: string;
    legal_name: string | null;
    phy_city: string | null;
    phy_state: string | null;
    phone: string | null;
    email: string | null;
    matched_on: string;
  }>(
    `SELECT dot_number, legal_name, phy_city, phy_state, phone, email,
            CASE
              WHEN $2 <> '' AND phone_digits = $2 AND $3 <> '' AND lower(email) = $3 THEN 'phone and email'
              WHEN $2 <> '' AND phone_digits = $2 THEN 'phone'
              ELSE 'email'
            END AS matched_on
     FROM carriers
     WHERE dot_number <> $1
       AND (
         ($2 <> '' AND phone_digits = $2)
         OR ($3 <> '' AND lower(email) = $3)
       )
     ORDER BY legal_name
     LIMIT 50`,
    [dot, phone ?? "", email],
  );

  return NextResponse.json({ carriers: rows });
}
