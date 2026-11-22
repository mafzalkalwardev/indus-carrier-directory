"use client";

import { useMemo, useState } from "react";
import type { LoadListing } from "@/lib/loads";

export type LoadRow = LoadListing & {
  ageMinutes?: number | null;
};

type Props = {
  loads: LoadRow[];
};

function ageCell(load: LoadRow) {
  return load.ageShort || load.postedAge?.replace(/^Posted\s+/i, "") || "—";
}

function parseAgeMinutes(load: LoadRow): number {
  if (typeof load.ageMinutes === "number") return load.ageMinutes;
  const short = load.ageShort || "";
  const m = short.match(/^(\d+)m$/i);
  if (m) return Number(m[1]);
  const h = short.match(/^(\d+)h$/i);
  if (h) return Number(h[1]) * 60;
  const d = short.match(/^(\d+)d$/i);
  if (d) return Number(d[1]) * 1440;
  return 999999;
}

export function LoadsResultsTable({ loads }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [maxAgeHours, setMaxAgeHours] = useState<string>("");
  const [minTrip, setMinTrip] = useState<string>("");
  const [maxTrip, setMaxTrip] = useState<string>("");
  const [minRpm, setMinRpm] = useState<string>("");

  const filtered = useMemo(() => {
    const ageCap = maxAgeHours === "" ? null : Number(maxAgeHours) * 60;
    const tripMin = minTrip === "" ? null : Number(minTrip);
    const tripMax = maxTrip === "" ? null : Number(maxTrip);
    const rpmMin = minRpm === "" ? null : Number(minRpm);

    return loads.filter((load) => {
      if (ageCap != null && Number.isFinite(ageCap) && parseAgeMinutes(load) > ageCap) return false;
      if (tripMin != null && Number.isFinite(tripMin) && (load.miles == null || load.miles < tripMin)) return false;
      if (tripMax != null && Number.isFinite(tripMax) && (load.miles == null || load.miles > tripMax)) return false;
      if (rpmMin != null && Number.isFinite(rpmMin)) {
        const rpm = load.ratePerMileAmount;
        if (rpm == null || rpm < rpmMin) return false;
      }
      return true;
    });
  }, [loads, maxAgeHours, minTrip, maxTrip, minRpm]);

  function toggle(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }

  return (
    <div className="dat-results-block">
      <div className="dat-result-filters" aria-label="Result filters">
        <label>
          <span>Age ≤</span>
          <select value={maxAgeHours} onChange={(e) => setMaxAgeHours(e.target.value)}>
            <option value="">Any</option>
            <option value="1">1 hr</option>
            <option value="2">2 hrs</option>
            <option value="4">4 hrs</option>
            <option value="8">8 hrs</option>
            <option value="24">24 hrs</option>
            <option value="48">48 hrs</option>
          </select>
        </label>
        <label>
          <span>Trip min</span>
          <input
            type="number"
            min={0}
            placeholder="mi"
            value={minTrip}
            onChange={(e) => setMinTrip(e.target.value)}
          />
        </label>
        <label>
          <span>Trip max</span>
          <input
            type="number"
            min={0}
            placeholder="mi"
            value={maxTrip}
            onChange={(e) => setMaxTrip(e.target.value)}
          />
        </label>
        <label>
          <span>Min $/mi</span>
          <input
            type="number"
            min={0}
            step="0.05"
            placeholder="2.50"
            value={minRpm}
            onChange={(e) => setMinRpm(e.target.value)}
          />
        </label>
        <span className="dat-filter-count">{filtered.length.toLocaleString()} shown</span>
      </div>

      <div className="dat-table-wrap">
        <table className="dat-table">
          <thead>
            <tr>
              <th>Age</th>
              <th>Rate</th>
              <th>Trip</th>
              <th>Origin</th>
              <th>Destination</th>
              <th>DH-O</th>
              <th>Eq</th>
              <th>Len</th>
              <th>Wt</th>
              <th>Company</th>
              <th>Contact</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((load) => {
              const id = `${load.source}-${load.id}`;
              const open = openId === id;
              return (
                <LoadExpandableRow
                  key={id}
                  load={load}
                  open={open}
                  onToggle={() => toggle(id)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 ? <p className="dat-empty">No loads match these filters.</p> : null}
    </div>
  );
}

function LoadExpandableRow({
  load,
  open,
  onToggle,
}: {
  load: LoadRow;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`dat-row${open ? " is-open" : ""}`}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        tabIndex={0}
        aria-expanded={open}
      >
        <td><span className="dat-age-link">{ageCell(load)}</span></td>
        <td className="dat-rate">
          <strong>{load.rate ?? "—"}</strong>
          <span>{load.perMile ?? ""}</span>
        </td>
        <td>{load.miles != null ? load.miles.toLocaleString() : "—"}</td>
        <td>{load.originCity}, {load.originState}</td>
        <td>{load.destinationCity}, {load.destinationState}</td>
        <td>{load.originDeadhead != null ? load.originDeadhead : "—"}</td>
        <td>{load.equipment}</td>
        <td>{load.lengthFt != null ? load.lengthFt : "—"}</td>
        <td>{load.weight !== "—" ? load.weight.replace(/ lbs$/i, "") : "—"}</td>
        <td className="dat-company">{load.brokerName ?? "—"}</td>
        <td className="dat-contact">{load.brokerPhone ?? "—"}</td>
        <td>
          {load.creditScore != null ? load.creditScore : (load.brokerGrade ?? "—")}
          {load.daysToPay != null ? <span className="dat-dtp"> · {load.daysToPay}d</span> : null}
        </td>
      </tr>
      {open ? (
        <tr className="dat-detail-row">
          <td colSpan={12}>
            <div className="dat-row-drawer">
              <div className="dat-drawer-grid">
                <section>
                  <h3>Shipment</h3>
                  <dl>
                    <div><dt>Pickup</dt><dd>{load.pickup || "—"}</dd></div>
                    <div>
                      <dt>Origin</dt>
                      <dd>
                        {load.originCity}, {load.originState}
                        {load.originDeadhead != null ? ` (${load.originDeadhead} DH)` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt>Destination</dt>
                      <dd>{load.destinationCity}, {load.destinationState}</dd>
                    </div>
                    <div><dt>Equipment</dt><dd>{load.equipment}{load.capacity ? ` · ${load.capacity}` : ""}</dd></div>
                    <div><dt>Length</dt><dd>{load.lengthFt != null ? `${load.lengthFt} ft` : "—"}</dd></div>
                    <div><dt>Weight</dt><dd>{load.weight || "—"}</dd></div>
                    <div><dt>Trip</dt><dd>{load.miles != null ? `${load.miles.toLocaleString()} mi` : "—"}</dd></div>
                    <div><dt>Age</dt><dd>{load.postedAge || load.ageShort || "—"}</dd></div>
                  </dl>
                  {(load.brokerPhone || load.brokerEmail) ? (
                    <div className="dat-drawer-contact">
                      <h4>Contact to book</h4>
                      <div className="dat-drawer-contact-links">
                        {load.brokerPhone ? (
                          <a
                            href={`tel:${load.brokerPhone.replace(/\D/g, "")}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {load.brokerPhone}
                          </a>
                        ) : null}
                        {load.brokerPhone && load.brokerEmail ? <span aria-hidden="true">·</span> : null}
                        {load.brokerEmail ? (
                          <a
                            href={`mailto:${load.brokerEmail}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {load.brokerEmail}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {load.notes || load.comments?.length ? (
                    <div className="dat-drawer-comments">
                      <h4>Comments</h4>
                      <p>
                        {(load.comments && load.comments.length ? load.comments.join(" · ") : load.notes) || ""}
                      </p>
                    </div>
                  ) : null}
                </section>
                <section>
                  <h3>Company</h3>
                  <p className="dat-drawer-broker">{load.brokerName || "Not listed"}</p>
                  <dl>
                    <div>
                      <dt>Phone</dt>
                      <dd>
                        {load.brokerPhone ? (
                          <a href={`tel:${load.brokerPhone.replace(/\D/g, "")}`} onClick={(e) => e.stopPropagation()}>
                            {load.brokerPhone}
                          </a>
                        ) : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>
                        {load.brokerEmail ? (
                          <a href={`mailto:${load.brokerEmail}`} onClick={(e) => e.stopPropagation()}>
                            {load.brokerEmail}
                          </a>
                        ) : "—"}
                      </dd>
                    </div>
                    <div><dt>Credit</dt><dd>{load.creditScore ?? load.brokerGrade ?? "—"}</dd></div>
                    <div><dt>Days to pay</dt><dd>{load.daysToPay ?? "—"}</dd></div>
                  </dl>
                </section>
                <section className="dat-drawer-rate">
                  <h3>Rate</h3>
                  <b>{load.rate ?? "Rate on board"}</b>
                  <span>{load.perMile ?? "—"}</span>
                  <button type="button" className="dat-drawer-close" onClick={onToggle}>
                    Close
                  </button>
                </section>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
