import { getPool, query } from "@/lib/db";
import { loadsHelperAuthHeaders } from "@/lib/helper-auth";

type MotusOfficer = {
  entityOfficerId?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  suffix?: string | null;
  title?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  disableDate?: string | null;
};

type MotusAuthority = {
  docketNumber?: string | null;
  disableDate?: string | null;
  operatingAuthorityType?: { operatingAuthorityType?: string | null } | null;
  operatingAuthorityStatus?: { operatingAuthorityStatusName?: string | null } | null;
};

type MotusRegistration = {
  entityRegistrationOperatingAuthorities?: { entityOperatingAuthority?: MotusAuthority | null }[] | null;
};

type MotusBody = {
  entityOfficers?: MotusOfficer[];
  entityRegistrations?: MotusRegistration[];
  phoneNumbers?: { phoneNumber?: string | null }[];
  emailAddresses?: { emailAddress?: string | null }[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export async function refreshMotusOfficers(dot: string) {
  const rows = await query<{ motus_officers_at: string | null; motus_authorities_at: string | null }>(
    `SELECT motus_officers_at, motus_authorities_at FROM carriers WHERE dot_number = $1`,
    [dot],
  );
  const fetched = rows[0];
  const officersFresh = fresh(fetched?.motus_officers_at);
  const authoritiesFresh = fresh(fetched?.motus_authorities_at);
  if (officersFresh && authoritiesFresh) return;

  let officers: MotusOfficer[] = [];
  let authorities: { docket: string; type: string; status: string | null }[] = [];
  let companyPhone: string | null = null;
  let companyEmail: string | null = null;
  try {
    const body = await fetchMotusBody(dot);
    if (!body) return;
    officers = (body.entityOfficers ?? []).filter((officer) => !officer.disableDate);
    authorities = (body.entityRegistrations ?? []).flatMap((registration) =>
      (registration.entityRegistrationOperatingAuthorities ?? []).flatMap((row) => {
        const authority = row.entityOperatingAuthority;
        if (!authority || authority.disableDate) return [];
        const docket = blank(authority.docketNumber);
        if (!docket) return [];
        return [{
          docket,
          type: blank(authority.operatingAuthorityType?.operatingAuthorityType) ?? "",
          status: blank(authority.operatingAuthorityStatus?.operatingAuthorityStatusName),
        }];
      }),
    );
    companyPhone = blank(body.phoneNumbers?.[0]?.phoneNumber);
    companyEmail = blank(body.emailAddresses?.[0]?.emailAddress)?.toLowerCase() ?? null;
  } catch {
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM carrier_officers WHERE dot_number = $1`, [dot]);
    await client.query(`DELETE FROM motus_authorities WHERE dot_number = $1`, [dot]);
    for (const officer of officers) {
      const key = officer.entityOfficerId || [officer.firstName, officer.lastName, officer.title, officer.email].filter(Boolean).join("|");
      if (!key) continue;
      await client.query(
        `INSERT INTO carrier_officers (
           dot_number, officer_key, first_name, middle_name, last_name, suffix, title, phone, email
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (dot_number, officer_key) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           middle_name = EXCLUDED.middle_name,
           last_name = EXCLUDED.last_name,
           suffix = EXCLUDED.suffix,
           title = EXCLUDED.title,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email`,
        [
          dot,
          key,
          blank(officer.firstName),
          blank(officer.middleName),
          blank(officer.lastName),
          blank(officer.suffix),
          blank(officer.title),
          blank(officer.phoneNumber),
          blank(officer.email)?.toLowerCase() ?? null,
        ],
      );
    }
    for (const authority of authorities) {
      await client.query(
        `INSERT INTO motus_authorities (dot_number, docket_number, authority_type, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (dot_number, docket_number, authority_type) DO UPDATE SET status = EXCLUDED.status`,
        [dot, authority.docket, authority.type, authority.status],
      );
    }
    await client.query(
      `UPDATE carriers SET
         phone = COALESCE(nullif(trim(phone),''), $2),
         phone_digits = COALESCE(nullif(phone_digits,''), regexp_replace(COALESCE($2,''), '\\D', '', 'g')),
         email = COALESCE(nullif(trim(email),''), $3),
         motus_officers_at = now(),
         motus_authorities_at = now()
       WHERE dot_number = $1`,
      [dot, companyPhone, companyEmail],
    );
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
}

async function fetchMotusBody(dot: string): Promise<MotusBody | null> {
  const proxy = (process.env.MOTUS_PROXY_BASE ?? "http://127.0.0.1:8799").replace(/\/+$/, "");
  // Prefer Chrome CDP proxy (US VPN). Direct Motus from cloud IPs is Akamai-blocked.
  try {
    const response = await fetch(`${proxy}/motus/${encodeURIComponent(dot)}`, {
      headers: loadsHelperAuthHeaders({ Accept: "application/json" }),
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const wrapped = (await response.json()) as {
      ok?: boolean;
      status?: number;
      empty?: boolean;
      data?: MotusBody | null;
    };
    if (!wrapped.ok || wrapped.empty || wrapped.status === 404) return wrapped.data ?? null;
    if (wrapped.status && wrapped.status !== 200) return null;
    return wrapped.data ?? null;
  } catch {
    return null;
  }
}

function fresh(value: string | null | undefined) {
  return Boolean(value && Date.now() - new Date(value).getTime() < DAY_MS);
}

function blank(value: string | null | undefined) {
  const text = value?.trim();
  return text ? text : null;
}
