"use client";

import { Fragment, useState } from "react";

type SampleLoad = {
  id: string;
  age: string;
  rate: string;
  rpm: string;
  trip: number;
  origin: string;
  destination: string;
  dh: number;
  eq: string;
  len: number;
  wt: string;
  company: string;
  phone: string | null;
  email: string | null;
  credit: string;
  days: number;
  comments: string;
};

const SAMPLE: SampleLoad[] = [
  {
    id: "1",
    age: "12m",
    rate: "$1,150",
    rpm: "$2.85/mi",
    trip: 404,
    origin: "Austin, TX",
    destination: "Dallas, TX",
    dh: 8,
    eq: "Straight box",
    len: 26,
    wt: "8,500",
    company: "Hill Country Freight",
    phone: "(512) 555-0142",
    email: "dispatch@hillcountry.example",
    credit: "96",
    days: 22,
    comments: "No touch. Appointment 14:00–16:00. Call before you book.",
  },
  {
    id: "2",
    age: "28m",
    rate: "$620",
    rpm: "$3.10/mi",
    trip: 200,
    origin: "Round Rock, TX",
    destination: "Houston, TX",
    dh: 18,
    eq: "Straight box",
    len: 24,
    wt: "6,200",
    company: "Gulf Stream Logistics",
    phone: null,
    email: "loads@gulfstream.example",
    credit: "94",
    days: 28,
    comments: "Liftgate preferred. Email for commodity details.",
  },
  {
    id: "3",
    age: "1h",
    rate: "$890",
    rpm: "$2.40/mi",
    trip: 371,
    origin: "San Antonio, TX",
    destination: "Oklahoma City, OK",
    dh: 42,
    eq: "Straight box",
    len: 26,
    wt: "9,800",
    company: "Red River Brokers",
    phone: "(405) 555-0199",
    email: null,
    credit: "91",
    days: 35,
    comments: "Partial OK. Driver assist at dest.",
  },
  {
    id: "4",
    age: "2h",
    rate: "$1,040",
    rpm: "$2.65/mi",
    trip: 392,
    origin: "Bastrop, TX",
    destination: "Shreveport, LA",
    dh: 31,
    eq: "Straight box",
    len: 16,
    wt: "4,100",
    company: "Pine Belt Transport",
    phone: "(318) 555-0177",
    email: "ops@pinebelt.example",
    credit: "97",
    days: 18,
    comments: "41×61×47 inches. Text or call for dock hours.",
  },
];

const EQUIP = ["Van", "Reefer", "Flatbed", "Box", "Power", "VP", "VG", "VM", "MV"];

export function PreviewLoadsBoard() {
  const [equipment, setEquipment] = useState("Box");
  const [openId, setOpenId] = useState<string | null>("1");

  return (
    <div>
      <div className="uip-board-title">
        <h1>Search loads</h1>
        <p>Type a city or ZIP, set DH-O / equipment, then search. Sample rows for preview only.</p>
      </div>

      <form
        className="uip-criteria"
        onSubmit={(event) => {
          event.preventDefault();
        }}
        aria-label="Preview load search"
      >
        <div className="uip-criteria-row">
          <label className="uip-field uip-field-grow">
            Origin
            <input defaultValue="Austin, TX" placeholder="City, ST or ZIP" />
          </label>
          <label className="uip-field uip-field-sm">
            DH-O
            <select defaultValue="150">
              {[50, 100, 150, 200, 300].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="uip-field uip-field-grow">
            Destination
            <input defaultValue="Anywhere" />
          </label>
          <label className="uip-field uip-field-sm">
            DH-D
            <select defaultValue="150">
              {[50, 100, 150, 200, 300].map((n) => (
                <option key={`d${n}`} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <div className="uip-field" style={{ flex: "1 1 220px" }}>
            Equipment
            <div className="uip-pills" role="group" aria-label="Equipment">
              {EQUIP.map((label) => (
                <button
                  key={label}
                  type="button"
                  className={equipment === label ? "is-on" : undefined}
                  onClick={() => setEquipment(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="uip-field uip-field-sm">
            Length
            <input defaultValue="26" />
          </label>
          <label className="uip-field uip-field-sm">
            Weight
            <input defaultValue="10000" />
          </label>
          <label className="uip-field uip-field-sm">
            Search back
            <input defaultValue="24" />
          </label>
          <button type="submit" className="uip-btn uip-btn-primary">
            Search
          </button>
        </div>
        <div className="uip-toggles">
          <span style={{ color: "var(--uip-muted)", fontSize: "0.8rem", fontWeight: 700 }}>Load requirements</span>
          <label><input type="checkbox" /> Book / Bid only</label>
          <label><input type="checkbox" defaultChecked /> Private network</label>
          <label><input type="checkbox" defaultChecked /> Load board</label>
        </div>
      </form>

      <div className="uip-results-bar">
        <strong>{SAMPLE.length} loads</strong>
        <span>Austin, TX · Anywhere · DH-O 150 · {equipment}</span>
      </div>

      <div className="uip-filters" aria-label="Result filters">
        <label>
          Age ≤
          <select defaultValue="">
            <option value="">Any</option>
            <option value="1">1 hr</option>
            <option value="4">4 hrs</option>
            <option value="24">24 hrs</option>
          </select>
        </label>
        <label>
          Trip min
          <input placeholder="mi" />
        </label>
        <label>
          Trip max
          <input placeholder="mi" />
        </label>
        <label>
          Min $/mi
          <input placeholder="2.50" defaultValue="2.50" />
        </label>
      </div>

      <div className="uip-table-wrap">
        <table className="uip-table">
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
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE.map((load) => {
              const open = openId === load.id;
              return (
                <Fragment key={load.id}>
                  <tr
                    className={open ? "is-open" : undefined}
                    onClick={() => setOpenId(open ? null : load.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setOpenId(open ? null : load.id);
                      }
                    }}
                    tabIndex={0}
                    aria-expanded={open}
                  >
                    <td><span className="uip-age">{load.age}</span></td>
                    <td className="uip-rate">
                      <strong>{load.rate}</strong>
                      <span>{load.rpm}</span>
                    </td>
                    <td>{load.trip.toLocaleString()}</td>
                    <td>{load.origin}</td>
                    <td>{load.destination}</td>
                    <td>{load.dh}</td>
                    <td>{load.eq}</td>
                    <td>{load.len}</td>
                    <td>{load.wt}</td>
                    <td>{load.company}</td>
                    <td>{load.credit} · {load.days}d</td>
                  </tr>
                  {open ? (
                    <tr className="uip-detail-row">
                      <td colSpan={11}>
                        <div className="uip-drawer">
                          <div className="uip-drawer-grid">
                            <section>
                              <h3>Shipment</h3>
                              <dl>
                                <div><dt>Origin</dt><dd>{load.origin} ({load.dh} DH)</dd></div>
                                <div><dt>Destination</dt><dd>{load.destination}</dd></div>
                                <div><dt>Equipment</dt><dd>{load.eq}</dd></div>
                                <div><dt>Length</dt><dd>{load.len} ft</dd></div>
                                <div><dt>Weight</dt><dd>{load.wt} lbs</dd></div>
                                <div><dt>Trip</dt><dd>{load.trip.toLocaleString()} mi</dd></div>
                              </dl>
                              {(load.phone || load.email) ? (
                                <div className="uip-contact">
                                  <h4>Contact to book</h4>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                                    {load.phone ? <a href={`tel:${load.phone.replace(/\D/g, "")}`} onClick={(e) => e.stopPropagation()}>{load.phone}</a> : null}
                                    {load.phone && load.email ? <span style={{ color: "var(--uip-muted)" }}>·</span> : null}
                                    {load.email ? <a href={`mailto:${load.email}`} onClick={(e) => e.stopPropagation()}>{load.email}</a> : null}
                                  </div>
                                </div>
                              ) : null}
                              <div className="uip-comments">
                                <h4>Comments</h4>
                                <p>{load.comments}</p>
                              </div>
                            </section>
                            <section>
                              <h3>Company</h3>
                              <p style={{ margin: "0 0 0.55rem", fontWeight: 700 }}>{load.company}</p>
                              <dl>
                                <div><dt>Credit</dt><dd>{load.credit}</dd></div>
                                <div><dt>Days to pay</dt><dd>{load.days}</dd></div>
                              </dl>
                            </section>
                            <section className="uip-drawer-rate">
                              <h3>Rate</h3>
                              <b>{load.rate}</b>
                              <span>{load.rpm}</span>
                              <button
                                type="button"
                                className="uip-btn uip-btn-ghost"
                                style={{ marginTop: "0.75rem", width: "fit-content" }}
                                onClick={() => setOpenId(null)}
                              >
                                Close
                              </button>
                            </section>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
