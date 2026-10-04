import { getPool } from "@/lib/db";
import { directorySql, readFilters } from "@/lib/search";

export const dynamic = "force-dynamic";

const DATASETS: Record<string, { filename: string; text: string }> = {
  fleet: {
    filename: "carrier-fleet.csv",
    text: `SELECT dot_number, ownership, vehicle_group, vehicle_type, units FROM carrier_fleet ORDER BY dot_number, ownership, vehicle_type`,
  },
  insurance: {
    filename: "insurance-policies.csv",
    text: `SELECT dot_number, docket_number, insurance_company_name, policy_no, ins_form_code, max_cov_amount, effective_date
           FROM insurance_policies ORDER BY dot_number`,
  },
  cancellations: {
    filename: "insurance-history.csv",
    text: `SELECT dot_number, docket_number, insurance_company_name, policy_no, filing_status_reason, effective_date, cancl_effective_date
           FROM insurance_history ORDER BY dot_number, cancl_effective_date DESC NULLS LAST`,
  },
  authority: {
    filename: "authority-history.csv",
    text: `SELECT dot_number, docket_number, op_auth_type, op_auth_status, reason, status_change_date
           FROM authority_history ORDER BY dot_number, status_change_date`,
  },
  dockets: {
    filename: "dockets.csv",
    text: `SELECT dot_number, docket_number, op_auth_type, op_auth_status, bipd_file, min_cov_amount
           FROM dockets ORDER BY dot_number, docket_number`,
  },
  inspections: {
    filename: "inspections.csv",
    text: `SELECT dot_number, inspection_id, insp_date, report_state, insp_level_id, viol_total, vehicle_oos_total, driver_oos_total
           FROM inspections ORDER BY insp_date, inspection_id`,
  },
  crashes: {
    filename: "crashes.csv",
    text: `SELECT dot_number, crash_id, report_date, state, fatalities, injuries, tow_away
           FROM crashes ORDER BY report_date, crash_id`,
  },
  vehicles: {
    filename: "inspected-vehicles.csv",
    text: `SELECT i.dot_number, u.vin, u.unit_make, u.unit_type, u.license_plate, u.license_state, u.unit_number
           FROM inspection_units u
           JOIN inspections i ON i.inspection_id = u.inspection_id
           ORDER BY i.dot_number, u.vin`,
  },
};

function csvCell(value: unknown) {
  if (value == null) return "";
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dataset = url.searchParams.get("dataset") || "carriers";
  const filters = readFilters({
    q: url.searchParams.get("q") ?? undefined,
    operation: url.searchParams.get("operation") ?? undefined,
    authority: url.searchParams.get("authority") ?? undefined,
    insurance: url.searchParams.get("insurance") ?? undefined,
    vehicle: url.searchParams.get("vehicle") ?? undefined,
    location: url.searchParams.get("location") ?? undefined,
    state: url.searchParams.get("state") ?? undefined,
    registered: url.searchParams.get("registered") ?? undefined,
    activated: url.searchParams.get("activated") ?? undefined,
    reinstated: url.searchParams.get("reinstated") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  const selected = dataset === "carriers"
    ? { filename: "carriers.csv", ...directorySql(filters) }
    : DATASETS[dataset]
      ? { ...DATASETS[dataset], params: [] as unknown[] }
      : null;
  if (!selected) return new Response("Unknown dataset.", { status: 400 });

  const client = await getPool().connect();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await client.query("BEGIN");
        await client.query("SET statement_timeout = 0");
        const cursor = await client.query(`DECLARE export_cursor NO SCROLL CURSOR FOR ${selected.text}`, selected.params ?? []);
        void cursor;
        let headerSent = false;
        for (;;) {
          const batch = await client.query("FETCH 2000 FROM export_cursor");
          if (batch.rows.length === 0) break;
          if (!headerSent) {
            controller.enqueue(encoder.encode(`${Object.keys(batch.rows[0]).join(",")}\n`));
            headerSent = true;
          }
          const lines = batch.rows
            .map((row) => Object.values(row).map(csvCell).join(","))
            .join("\n");
          controller.enqueue(encoder.encode(`${lines}\n`));
        }
        await client.query("CLOSE export_cursor");
        await client.query("COMMIT");
        controller.close();
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* the connection is already closing */
        }
        controller.error(error);
      } finally {
        client.release();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${selected.filename}"`,
    },
  });
}
