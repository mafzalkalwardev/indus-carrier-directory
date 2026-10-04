import { query } from "@/lib/db";

const SERVICES = new Set(["dispatch", "fuel-cards", "factoring", "eld", "insurance"]);

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS service_leads (
      id bigserial PRIMARY KEY,
      service text NOT NULL,
      contact_name text NOT NULL,
      phone text,
      email text,
      dot_number text,
      note text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Send a name and a way to reach you." }, { status: 400 });
  }
  const service = String(body.service ?? "");
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const email = String(body.email ?? "").trim();
  const dot = String(body.dot ?? "").replace(/\D/g, "");
  const note = String(body.note ?? "").trim();
  if (!SERVICES.has(service)) return Response.json({ error: "Pick a service." }, { status: 400 });
  if (name.length < 2 || name.length > 80) return Response.json({ error: "Enter your name." }, { status: 400 });
  if (!phone && !email) return Response.json({ error: "Add a phone number or an email." }, { status: 400 });
  if (phone.length > 30 || email.length > 120 || note.length > 500 || dot.length > 12) {
    return Response.json({ error: "One of those fields is too long." }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "That email does not look right." }, { status: 400 });
  }

  await ensureTable();
  await query(
    `INSERT INTO service_leads (service, contact_name, phone, email, dot_number, note)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [service, name, phone || null, email || null, dot || null, note || null],
  );
  return Response.json({ ok: true });
}
