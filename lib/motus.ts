import { getPool, query } from "@/lib/db";

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
  try {
    const response = await fetch(`https://motus.dot.gov/api/carriers/${encodeURIComponent(dot)}`, {
      headers: { Accept: "application/json", "User-Agent": "carrier-directory/1.0" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!response.ok) return;
    const body = (await response.json()) as {
      entityOfficers?: MotusOfficer[];
      entityRegistrations?: MotusRegistration[];
    };
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
      `UPDATE carriers SET motus_officers_at = now(), motus_authorities_at = now() WHERE dot_number = $1`,
      [dot],
    );
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
}

function fresh(value: string | null | undefined) {
  return Boolean(value && Date.now() - new Date(value).getTime() < DAY_MS);
}

function blank(value: string | null | undefined) {
  const text = value?.trim();
  return text ? text : null;
}
