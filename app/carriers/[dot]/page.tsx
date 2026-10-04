import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/StatusPill";
import { ProfileActions } from "@/components/ProfileActions";
import { getCarrier, latestFeeds } from "@/lib/carriers";
import { refreshMotusOfficers } from "@/lib/motus";
import { query } from "@/lib/db";
import {
  ageBandLabel,
  authorityAge,
  fleetLabel,
  formatDate,
  formatMoney,
  formatNumber,
  formatPhone,
  normalizeDot,
  operationLabel,
  padDot,
  percent,
  pickAuthorityAgeDate,
  recordStatus,
} from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ dot: string }> }) {
  const dot = normalizeDot((await params).dot);
  const carrier = await getCarrier(dot).catch(() => null);
  return { title: carrier?.legal_name ?? `DOT ${padDot(dot)}` };
}

export default async function CarrierPage({ params }: { params: Promise<{ dot: string }> }) {
  const dot = normalizeDot((await params).dot);
  if (!dot) notFound();

  await refreshMotusOfficers(dot).catch(() => undefined);
  const carrier = await getCarrier(dot).catch(() => null);
  if (!carrier) notFound();

  const [dockets, policies, history, revocations, agents, inspections, crashes, units, violations, fleet, cancellations, officials, censusDockets, motusAuthorities, feeds] = await Promise.all([
    query<{ docket_number: string; op_auth_type: string; op_auth_status: string | null; bipd_file: string | null }>(
      `SELECT docket_number, op_auth_type, op_auth_status, bipd_file::text FROM dockets WHERE dot_number = $1 ORDER BY op_auth_type`,
      [dot],
    ),
    query<{
      policy_no: string | null;
      insurance_company_name: string | null;
      max_cov_amount: string | null;
      effective_date: string | null;
      ins_form_code: string | null;
    }>(
      `SELECT policy_no, insurance_company_name, max_cov_amount::text, effective_date::text, ins_form_code
       FROM insurance_policies WHERE dot_number = $1 ORDER BY effective_date DESC NULLS LAST`,
      [dot],
    ),
    query<{ op_auth_status: string | null; reason: string | null; status_change_date: string | null; op_auth_type: string | null }>(
      `SELECT op_auth_status, reason, status_change_date::text, op_auth_type
       FROM authority_history WHERE dot_number = $1 ORDER BY status_change_date DESC NULLS LAST LIMIT 30`,
      [dot],
    ),
    query<{ order_type: string | null; order_serve_date: string | null; order_effective_date: string | null; docket_number: string | null }>(
      `SELECT order_type, order_serve_date::text, order_effective_date::text, docket_number
       FROM revocations WHERE dot_number = $1 ORDER BY order_effective_date DESC NULLS LAST LIMIT 20`,
      [dot],
    ),
    query<{ co_name: string | null; city: string | null; state_code: string | null }>(
      `SELECT co_name, city, state_code FROM process_agents WHERE dot_number = $1 LIMIT 10`,
      [dot],
    ),
    query<{
      inspection_id: string;
      insp_date: string;
      report_state: string | null;
      insp_level_id: string | null;
      viol_total: number | null;
      vehicle_oos_total: number | null;
      driver_oos_total: number | null;
    }>(
      `SELECT inspection_id, insp_date::text, report_state, insp_level_id, viol_total, vehicle_oos_total, driver_oos_total
       FROM inspections
       WHERE dot_number = $1 AND insp_date >= (current_date - interval '24 months')
       ORDER BY insp_date DESC LIMIT 15`,
      [dot],
    ),
    query<{ crash_id: string; report_date: string; state: string | null; fatalities: number | null; injuries: number | null; tow_away: string | null }>(
      `SELECT crash_id, report_date::text, state, fatalities, injuries, tow_away
       FROM crashes
       WHERE dot_number = $1 AND report_date >= (current_date - interval '24 months')
       ORDER BY report_date DESC LIMIT 15`,
      [dot],
    ),
    query<{ unit_make: string | null; vin: string | null; unit_type: string | null; license_state: string | null }>(
      `SELECT u.unit_make, u.vin, u.unit_type, u.license_state
       FROM inspection_units u
       JOIN inspections i ON i.inspection_id = u.inspection_id
       WHERE i.dot_number = $1 AND i.insp_date >= (current_date - interval '24 months')
       ORDER BY i.insp_date DESC LIMIT 12`,
      [dot],
    ),
    query<{ viol_code: string | null; viol_desc: string | null; out_of_service: string | null; insp_date: string }>(
      `SELECT v.viol_code, v.viol_desc, v.out_of_service, i.insp_date::text
       FROM inspection_violations v
       JOIN inspections i ON i.inspection_id = v.inspection_id
       WHERE i.dot_number = $1 AND i.insp_date >= (current_date - interval '24 months')
       ORDER BY i.insp_date DESC LIMIT 12`,
      [dot],
    ),
    query<{ ownership: string; vehicle_type: string; units: number }>(
      `SELECT ownership, vehicle_type, units FROM carrier_fleet WHERE dot_number = $1 ORDER BY ownership, vehicle_type`,
      [dot],
    ),
    query<{ policy_no: string | null; insurance_company_name: string | null; cancl_effective_date: string | null; filing_status_reason: string | null }>(
      `SELECT policy_no, insurance_company_name, cancl_effective_date::text, filing_status_reason
       FROM insurance_history WHERE dot_number = $1 AND cancl_effective_date IS NOT NULL
       ORDER BY cancl_effective_date DESC NULLS LAST LIMIT 12`,
      [dot],
    ),
    query<{
      first_name: string | null;
      middle_name: string | null;
      last_name: string | null;
      suffix: string | null;
      title: string | null;
      phone: string | null;
      email: string | null;
    }>(
      `SELECT first_name, middle_name, last_name, suffix, title, phone, email
       FROM carrier_officers WHERE dot_number = $1
       ORDER BY last_name NULLS LAST, first_name NULLS LAST`,
      [dot],
    ),
    query<{ prefix: string | null; docket_number: string; status_code: string | null }>(
      `SELECT prefix, docket_number, status_code FROM census_dockets WHERE dot_number = $1 ORDER BY slot`,
      [dot],
    ),
    query<{ docket_number: string; authority_type: string; status: string | null }>(
      `SELECT docket_number, authority_type, status FROM motus_authorities WHERE dot_number = $1 ORDER BY docket_number, authority_type`,
      [dot],
    ),
    latestFeeds().catch(() => []),
  ]);

  const location = [carrier.phy_city, carrier.phy_state].filter(Boolean).join(", ");
  const status = recordStatus(carrier.authority_status, carrier.status_code);
  const authorityKind = carrier.common_authority_status
    ? `Common ${carrier.common_authority_status}`
    : carrier.broker_authority_status
      ? `Broker ${carrier.broker_authority_status}`
      : status ?? "No authority";
  const earliestGrant = history
    .filter((row) => /active/i.test(row.op_auth_status ?? "") || /granted/i.test(row.reason ?? ""))
    .map((row) => row.status_change_date)
    .filter((value): value is string => Boolean(value))
    .sort()[0] ?? null;
  const ageDate = pickAuthorityAgeDate(carrier.authority_granted_date, earliestGrant, carrier.add_date);
  const statusTone = status === "Active" ? "good" : status === "Pending" ? "warn" : status === "Inactive" ? "bad" : "neutral";
  const equipmentTotals = new Map<string, number>();
  for (const row of fleet) {
    equipmentTotals.set(row.vehicle_type, (equipmentTotals.get(row.vehicle_type) ?? 0) + Number(row.units));
  }
  const equipment = [...equipmentTotals.entries()].filter(([, count]) => count > 0).slice(0, 3);
  const officialCards = officials.length > 0
    ? officials.map((official) => ({
        name: [official.first_name, official.middle_name, official.last_name, official.suffix].filter(Boolean).join(" ") || "Unnamed official",
        title: official.title?.replace(/_/g, " ") ?? null,
        phone: official.phone,
        email: official.email,
      }))
    : [carrier.officer_1, carrier.officer_2].filter(Boolean).map((name) => ({
        name: name as string,
        title: null,
        phone: null,
        email: null,
      }));
  const measures = carrier.sms_measures ?? {};
  const docketDigits = (value: string) => value.replace(/\D/g, "").replace(/^0+/, "");
  const shownDockets = new Set([
    ...motusAuthorities.map((row) => docketDigits(row.docket_number)),
    ...dockets.map((row) => docketDigits(row.docket_number)),
  ]);
  const censusAuthority = (censusDockets.length > 0
    ? censusDockets
    : carrier.docket1
      ? [{ prefix: carrier.docket1prefix, docket_number: carrier.docket1, status_code: carrier.docket1_status_code }]
      : []
  ).filter((row) => !shownDockets.has(docketDigits(row.docket_number)));

  return (
    <main className="profile">
      <p className="crumbs">
        {carrier.phy_state ? <Link href={`/states/${carrier.phy_state}`}>{carrier.phy_state}</Link> : "Directory"}
        {carrier.phy_city && carrier.phy_state ? (
          <>
            {" / "}
            <Link href={`/states/${carrier.phy_state}/${encodeURIComponent(carrier.phy_city)}`}>{carrier.phy_city}</Link>
          </>
        ) : null}
      </p>
      <div className="profile-head">
        <div>
          <div className="chips" style={{ marginBottom: 10 }}>
            <span className="chip accent">USDOT {padDot(carrier.dot_number)}</span>
            {carrier.docket1 ? <span className="chip">{carrier.docket1prefix ?? "MC"} {carrier.docket1}</span> : null}
            <StatusPill status={status} />
            {carrier.carrier_operation ? <span className="chip">{operationLabel(carrier.carrier_operation)}</span> : null}
            {carrier.trust_grade ? <span className="chip">{carrier.trust_grade} · {carrier.trust_score ?? "—"}</span> : null}
          </div>
          <h1>{carrier.legal_name ?? "Unnamed carrier"}</h1>
          {carrier.dba_name ? <p className="muted">DBA {carrier.dba_name}</p> : null}
          <p className="muted">{location || "Location not on the census row"}</p>
          <div className="bs-stats">
            <div className="bs-stat">
              <span>USDOT</span>
              <strong>{padDot(carrier.dot_number)}</strong>
            </div>
            <div className="bs-stat">
              <span>{carrier.docket1prefix ?? "MC"}</span>
              <strong>{carrier.docket1 ?? "None on file"}</strong>
            </div>
            <div className="bs-stat">
              <span>Operation</span>
              <strong>{carrier.carrier_operation ? operationLabel(carrier.carrier_operation) : "Not reported"}</strong>
            </div>
            <div className="bs-stat">
              <span>MC registered</span>
              <strong>{carrier.add_date ? formatDate(carrier.add_date) : "Not on file"}</strong>
            </div>
            <div className={`bs-stat tone-${statusTone}`}>
              <span>Authority</span>
              <strong>{authorityKind}</strong>
            </div>
            <div className="bs-stat">
              <span>Authority age</span>
              <strong>{authorityAge(ageDate)}</strong>
            </div>
            <div className="bs-stat">
              <span>Truck type</span>
              <strong>{equipment.length ? equipment.map(([type, count]) => `${type} ${count}`).join(" · ") : Number(carrier.power_units) > 0 ? `${formatNumber(carrier.power_units)} power units` : "None reported"}</strong>
            </div>
            <div className="bs-stat">
              <span>Drivers</span>
              <strong>{formatNumber(carrier.total_drivers)}</strong>
            </div>
          </div>
          <div className="contact-row">
            {carrier.phone ? <a href={`tel:${carrier.phone}`}>{formatPhone(carrier.phone)}</a> : <span>No company phone</span>}
            {carrier.email ? <a href={`mailto:${carrier.email}`}>{carrier.email}</a> : <span>No company email</span>}
          </div>
        </div>
        <aside className="official-side">
          <h2>Company officials</h2>
          {officialCards.length > 0 ? (
            <ul className="people">
              {officialCards.map((official) => (
                <li key={`${official.name}-${official.email ?? ""}`}>
                  <strong>{official.name}</strong>
                  {official.title ? <div className="role">{official.title}</div> : null}
                  <div>{official.phone ? <a href={`tel:${official.phone}`}>{formatPhone(official.phone) ?? official.phone}</a> : "No phone"}</div>
                  <div>{official.email ? <a href={`mailto:${official.email}`}>{official.email}</a> : "No email"}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No company officials are on the public record.</p>
          )}
        </aside>
      </div>

      <section className="snap">
        <h2>Snapshot</h2>
      <div className="facts">
        <div className="fact"><span>Authority</span><b><StatusPill status={status} />{status ? "" : "—"}</b></div>
        <div className="fact"><span>Common</span><b>{carrier.common_authority_status ? <StatusPill status={carrier.common_authority_status} /> : "—"}</b></div>
        <div className="fact"><span>Contract</span><b>{carrier.contract_authority_status ? <StatusPill status={carrier.contract_authority_status} /> : "—"}</b></div>
        <div className="fact"><span>Operation</span><b>{operationLabel(carrier.carrier_operation)}</b></div>
        <div className="fact"><span>Active for</span><b>{authorityAge(ageDate)}</b></div>
        <div className="fact"><span>MC registered</span><b>{carrier.add_date ? formatDate(carrier.add_date) : "—"}</b></div>
        <div className="fact"><span>Out of service</span><b>{carrier.out_of_service ? <span className="pill bad">Yes</span> : <span className="pill good">No</span>}</b></div>
        <div className="fact"><span>Power units</span><b>{formatNumber(carrier.power_units)}</b></div>
        <div className="fact"><span>Drivers</span><b>{formatNumber(carrier.total_drivers)}</b></div>
        <div className="fact"><span>Interstate drivers</span><b>{formatNumber(carrier.interstate_drivers)}</b></div>
        <div className="fact"><span>Intrastate drivers</span><b>{formatNumber(carrier.intrastate_drivers)}</b></div>
        <div className="fact"><span>Insurance cancellation</span><b>{carrier.insurance_cancel_pending ? <span className="pill warn">Pending</span> : <span className="pill good">None pending</span>}</b></div>
        <div className="fact"><span>Fleet size</span><b>{fleetLabel(carrier.fleetsize)}</b></div>
        <div className="fact"><span>BIPD on file</span><b>{formatMoney(carrier.bipd_on_file)}</b></div>
      </div>
      </section>

      <section className="snap">
        <h2>Equipment reported to FMCSA</h2>
        <p className="muted">
          Counts from the company census, the same equipment breakdown MOTUS shows: owned, term leased, and trip leased.
          This is not a list of individual VINs. VINs appear only when a vehicle was on a roadside inspection.
        </p>
        {fleet.length === 0 ? <p>No vehicle counts are stored for this DOT yet.</p> : (
          <table>
            <thead><tr><th>Ownership</th><th>Type</th><th>Units</th></tr></thead>
            <tbody>
              {fleet.map((row) => (
                <tr key={`${row.ownership}-${row.vehicle_type}`}>
                  <td>{row.ownership}</td>
                  <td>{row.vehicle_type}</td>
                  <td>{formatNumber(row.units)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <section className="snap">
          <h2>Score breakdown</h2>
          <table>
            <tbody>
              <tr><td>Authority status</td><td>{carrier.authority_status === "Active" ? "Active carrier authority" : carrier.authority_status ?? "Not active"}</td><td>{carrier.score_authority ?? 0}/20</td></tr>
              <tr><td>Authority age</td><td>{ageBandLabel(ageDate, carrier.authority_status)}</td><td>{carrier.score_age ?? 0}/20</td></tr>
              <tr><td>Insurance</td><td>{carrier.insurance_current ? "BIPD liability insurance on file" : "No current BIPD on file"}</td><td>{carrier.score_insurance ?? 0}/25</td></tr>
              <tr><td>Revocation history</td><td>{carrier.revocation_count > 0 || carrier.prior_revoke_flag === "Y" ? `${carrier.revocation_count} revocation record(s)` : "No executed revocations"}</td><td>{carrier.score_revocation ?? 0}/25</td></tr>
              <tr><td>Safety</td><td>{carrier.inspections_24m > 0 ? `${carrier.inspections_24m} inspections in 24 months, OOS rate ${percent(carrier.oos_rate)}` : "No FMCSA safety record in the loaded window"}</td><td>{carrier.score_safety ?? 0}/10</td></tr>
            </tbody>
          </table>
          <p className="muted">Safety points are a bonus. Thin data earns zero. It never subtracts, and it is not an official CSA percentile.</p>
        </section>
        <section className="snap">
          <h2>Identity</h2>
          <p>{carrier.phy_street}<br />{[carrier.phy_city, carrier.phy_state, carrier.phy_zip].filter(Boolean).join(" ")}</p>
          <h3>Company officials</h3>
          {officials.length > 0 ? (
            <ul className="people">
              {officials.map((official) => {
                const name = [official.first_name, official.middle_name, official.last_name, official.suffix].filter(Boolean).join(" ");
                return (
                  <li key={`${name}-${official.email}`}>
                    <strong>{name || "Unnamed official"}</strong>
                    {official.title ? <div className="role">{official.title.replace(/_/g, " ")}</div> : null}
                    <div>
                      {official.phone ? <a href={`tel:${official.phone}`}>{formatPhone(official.phone) ?? official.phone}</a> : "No phone"}
                    </div>
                    <div>
                      {official.email ? <a href={`mailto:${official.email}`}>{official.email}</a> : "No email"}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : carrier.officer_1 || carrier.officer_2 ? (
            <ul className="plain-list">
              {carrier.officer_1 ? <li>{carrier.officer_1}</li> : null}
              {carrier.officer_2 ? <li>{carrier.officer_2}</li> : null}
            </ul>
          ) : (
            <p>No company officials are listed for this DOT.</p>
          )}
          <p className="muted">
            Names, titles, phones, and emails come from the public MOTUS carrier record and refresh when this page is opened if the saved copy is older than a day.
            {carrier.business_org_desc ? ` Organization: ${carrier.business_org_desc}.` : ""}
          </p>
          <p className="muted">
            Added {formatDate(carrier.add_date)} · MCS-150 {formatDate(carrier.mcs150_date)}
            {Number(carrier.mcs150_mileage) > 0
              ? ` · ${formatNumber(carrier.mcs150_mileage)} miles reported for ${carrier.mcs150_mileage_year || "an unstated year"}`
              : ""}
          </p>
          {carrier.cargo && carrier.cargo.length > 0 ? <p>Cargo: {carrier.cargo.join(", ")}</p> : null}
          {carrier.classdef ? <p className="muted">{carrier.classdef}</p> : null}
          {carrier.live_checked_at ? (
            <p className="muted">
              QCMobile overlay {formatDate(carrier.live_checked_at)}
              {carrier.live_safety_rating ? ` · safety rating ${carrier.live_safety_rating}` : ""}
              {carrier.live_allowed_to_operate ? ` · allowed to operate ${carrier.live_allowed_to_operate}` : ""}
            </p>
          ) : null}
        </section>
      </div>

      <section className="snap">
        <h2>Operating authority</h2>
        {dockets.length === 0 && censusAuthority.length === 0 && motusAuthorities.length === 0 ? (
          <p>No MC number or operating authority is on file for this DOT.</p>
        ) : (
          <table>
            <thead><tr><th>Docket</th><th>Type</th><th>Status</th><th>Source</th></tr></thead>
            <tbody>
              {motusAuthorities.map((row) => (
                <tr key={`motus-${row.docket_number}-${row.authority_type}`}>
                  <td>{row.docket_number}</td>
                  <td>{row.authority_type || "—"}</td>
                  <td>{row.status ?? "—"}</td>
                  <td>MOTUS</td>
                </tr>
              ))}
              {dockets.filter((row) => !motusAuthorities.some((live) => live.docket_number === row.docket_number)).map((row) => (
                <tr key={`${row.docket_number}-${row.op_auth_type}`}>
                  <td>{row.docket_number}</td>
                  <td>{row.op_auth_type || "—"}</td>
                  <td>{row.op_auth_status ?? "—"}</td>
                  <td>MOTUS file</td>
                </tr>
              ))}
              {censusAuthority.map((row) => (
                <tr key={`census-${row.prefix}-${row.docket_number}`}>
                  <td>{[row.prefix, row.docket_number].filter(Boolean).join(" ")}</td>
                  <td>—</td>
                  <td>{recordStatus(null, row.status_code) ?? "—"}</td>
                  <td>Census</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted">
          A company can have up to three MC, MX, or FF numbers on the census, and more than one authority type on MOTUS.
          The nightly MOTUS file has the current authority rows. Census numbers that never landed in that file are listed here too.
        </p>
      </section>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <section className="snap">
          <h2>Insurance on file</h2>
          {carrier.insurance_cancel_pending ? <p>A cancellation effective date is still in the future.</p> : null}
          {policies.length === 0 ? <p>No active or pending policy in the MOTUS insurance file.</p> : (
            <table>
              <thead><tr><th>Insurer</th><th>Policy</th><th>Amount</th><th>Effective</th></tr></thead>
              <tbody>
                {policies.map((policy, index) => (
                  <tr key={`${policy.policy_no}-${index}`}>
                    <td>{policy.insurance_company_name ?? "—"}<div className="muted">{policy.ins_form_code}</div></td>
                    <td>{policy.policy_no ?? "—"}</td>
                    <td>{formatMoney(policy.max_cov_amount)}</td>
                    <td>{formatDate(policy.effective_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {cancellations.length > 0 ? (
            <>
              <h3>Cancellation dates</h3>
              <table>
                <thead><tr><th>Insurer</th><th>Policy</th><th>Reason</th><th>Effective</th></tr></thead>
                <tbody>
                  {cancellations.map((row, index) => (
                    <tr key={`${row.policy_no}-${index}`}>
                      <td>{row.insurance_company_name ?? "—"}</td>
                      <td>{row.policy_no ?? "—"}</td>
                      <td>{row.filing_status_reason ?? "—"}</td>
                      <td>{formatDate(row.cancl_effective_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </section>
        <section className="snap">
          <h2>Authority history</h2>
          {history.length === 0 ? <p>No authority history rows.</p> : (
            <table>
              <thead><tr><th>Date</th><th>Status</th><th>Reason</th></tr></thead>
              <tbody>
                {history.map((row, index) => (
                  <tr key={`${row.status_change_date}-${index}`}>
                    <td>{formatDate(row.status_change_date)}</td>
                    <td>{row.op_auth_status ?? "—"}</td>
                    <td>{row.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="snap">
        <h2>Safety, last 24 months</h2>
        <div className="facts">
          <div className="fact"><span>Inspections</span><b>{formatNumber(carrier.inspections_24m)}</b></div>
          <div className="fact"><span>Vehicle OOS</span><b>{formatNumber(carrier.vehicle_oos_24m)}</b></div>
          <div className="fact"><span>Driver OOS</span><b>{formatNumber(carrier.driver_oos_24m)}</b></div>
          <div className="fact"><span>OOS rate</span><b>{percent(carrier.oos_rate)}</b></div>
          <div className="fact"><span>Crashes</span><b>{formatNumber(carrier.crashes_24m)}</b></div>
          <div className="fact"><span>Fatal</span><b>{formatNumber(carrier.fatal_crashes_24m)}</b></div>
          <div className="fact"><span>Injury</span><b>{formatNumber(carrier.injury_crashes_24m)}</b></div>
          <div className="fact"><span>Last inspection</span><b>{formatDate(carrier.last_inspection_date)}</b></div>
        </div>
        {carrier.sms_insp_total != null ? (
          <p className="muted">
            Monthly SMS snapshot: {formatNumber(carrier.sms_insp_total)} inspections,
            driver OOS {formatNumber(carrier.sms_driver_oos_insp_total)} of {formatNumber(carrier.sms_driver_insp_total)},
            vehicle OOS {formatNumber(carrier.sms_vehicle_oos_insp_total)} of {formatNumber(carrier.sms_vehicle_insp_total)}.
            Measures (not public percentiles): unsafe driving {String(measures.unsafeDriving ?? "—")}, hours of service {String(measures.hoursOfService ?? "—")}, driver fitness {String(measures.driverFitness ?? "—")}, controlled substances {String(measures.controlledSubstances ?? "—")}, vehicle maintenance {String(measures.vehicleMaintenance ?? "—")}.
          </p>
        ) : (
          <p className="muted">No SMS output row is loaded for this DOT. Property-carrier BASIC percentiles are not in the public file.</p>
        )}
        {inspections.length > 0 ? (
          <table>
            <thead><tr><th>Date</th><th>State</th><th>Level</th><th>Violations</th><th>Vehicle OOS</th><th>Driver OOS</th></tr></thead>
            <tbody>
              {inspections.map((row) => (
                <tr key={row.inspection_id}>
                  <td>{formatDate(row.insp_date)}</td>
                  <td>{row.report_state ?? "—"}</td>
                  <td>{row.insp_level_id ?? "—"}</td>
                  <td>{formatNumber(row.viol_total)}</td>
                  <td>{formatNumber(row.vehicle_oos_total)}</td>
                  <td>{formatNumber(row.driver_oos_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p>No roadside inspections in the loaded 24-month window.</p>}
        {crashes.length > 0 ? (
          <table>
            <thead><tr><th>Crash date</th><th>State</th><th>Fatalities</th><th>Injuries</th><th>Tow</th></tr></thead>
            <tbody>
              {crashes.map((row) => (
                <tr key={row.crash_id}>
                  <td>{formatDate(row.report_date)}</td>
                  <td>{row.state ?? "—"}</td>
                  <td>{formatNumber(row.fatalities)}</td>
                  <td>{formatNumber(row.injuries)}</td>
                  <td>{row.tow_away ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {violations.length > 0 ? (
          <>
            <h2>Recent violations</h2>
            <table>
              <thead><tr><th>Date</th><th>Code</th><th>Description</th><th>OOS</th></tr></thead>
              <tbody>
                {violations.map((row, index) => (
                  <tr key={`${row.viol_code}-${index}`}>
                    <td>{formatDate(row.insp_date)}</td>
                    <td>{row.viol_code ?? "—"}</td>
                    <td>{row.viol_desc ?? "—"}</td>
                    <td>{row.out_of_service ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
        {units.length > 0 ? (
          <>
            <h2>Vehicles seen at inspection</h2>
            <p className="muted">Only vehicles that were on a published inspection. The census equipment counts above are the reported fleet.</p>
            <table>
              <thead><tr><th>Type</th><th>Make</th><th>Plate state</th><th>VIN</th></tr></thead>
              <tbody>
                {units.map((row, index) => (
                  <tr key={`${row.vin}-${index}`}>
                    <td>{row.unit_type ?? "—"}</td>
                    <td>{row.unit_make ?? "—"}</td>
                    <td>{row.license_state ?? "—"}</td>
                    <td>{row.vin ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
      </section>

      {revocations.length > 0 ? (
        <section className="snap">
          <h2>Revocations and suspensions</h2>
          <table>
            <thead><tr><th>Docket</th><th>Type</th><th>Served</th><th>Effective</th></tr></thead>
            <tbody>
              {revocations.map((row, index) => (
                <tr key={`${row.docket_number}-${index}`}>
                  <td>{row.docket_number ?? "—"}</td>
                  <td>{row.order_type ?? "—"}</td>
                  <td>{formatDate(row.order_serve_date)}</td>
                  <td>{formatDate(row.order_effective_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {agents.length > 0 ? (
        <section className="snap">
          <h2>Process agents</h2>
          <ul className="plain-list">
            {agents.map((agent, index) => (
              <li key={`${agent.co_name}-${index}`}>{agent.co_name}{agent.city ? ` · ${agent.city}` : ""}{agent.state_code ? `, ${agent.state_code}` : ""}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <ProfileActions dot={dot} />
      </div>

      <section className="snap source-links">
        <h2>Source records</h2>
        <p className="muted">Open the public FMCSA files for this DOT, or download the row as CSV.</p>
        <div className="links">
          <a href={`https://motus.dot.gov/customer/${carrier.dot_number}/account`} target="_blank" rel="noreferrer">MOTUS record</a>
          <a href={`https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${carrier.dot_number}`} target="_blank" rel="noreferrer">FMCSA SAFER</a>
          <a href={`https://ai.fmcsa.dot.gov/SMS/Carrier/${carrier.dot_number}/Overview.aspx`} target="_blank" rel="noreferrer">SMS overview</a>
          <a href={`/api/export?dataset=carriers&q=${carrier.dot_number}`}>Download CSV</a>
        </div>
      </section>

      {feeds.length > 0 ? (
        <p className="muted">
          Loaded feeds: {feeds.map((feed) => `${feed.feed_key} ${feed.source_updated_at ? formatDate(feed.source_updated_at) : formatDate(feed.loaded_at)}`).join(" · ")}
          {" · "}Directory refreshes nightly from FMCSA public files.
        </p>
      ) : null}
    </main>
  );
}
