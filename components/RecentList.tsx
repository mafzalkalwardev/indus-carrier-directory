import Link from "next/link";
import { StatusPill } from "@/components/StatusPill";
import type { RecentCarrier } from "@/lib/recent";
import { formatDate, padDot, recordStatus } from "@/lib/format";

export function RecentList({ carriers }: { carriers: RecentCarrier[] }) {
  if (carriers.length === 0) return <p className="muted">None in the last 7 days.</p>;
  return (
    <div className="results">
      {carriers.map((carrier) => (
        <Link className="result" key={`${carrier.dot_number}-${carrier.event_label}`} href={`/carriers/${carrier.dot_number}`}>
          <div className={`grade ${carrier.trust_grade ?? ""}`}>{carrier.trust_grade ?? "–"}</div>
          <div>
            <h2>{carrier.legal_name ?? "Unnamed carrier"}</h2>
            <div className="chips">
              <span className={`pill ${carrier.event_label === "Reinstated" ? "warn" : "good"}`}>{carrier.event_label}</span>
              <span className="chip">{formatDate(carrier.event_date)}</span>
              {carrier.docket_number ? <span className="chip accent">{carrier.docket_number}</span> : null}
              <span className="chip">USDOT {padDot(carrier.dot_number)}</span>
              <StatusPill status={recordStatus(carrier.authority_status, carrier.status_code)} />
              {carrier.phy_city || carrier.phy_state ? (
                <span className="chip">{[carrier.phy_city, carrier.phy_state].filter(Boolean).join(", ")}</span>
              ) : null}
            </div>
          </div>
          <div className="score-side">
            <b>{carrier.trust_score ?? "—"}</b>
            <span className="muted">/ 100</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
