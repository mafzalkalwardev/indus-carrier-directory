import Link from "next/link";
import { Copyable } from "@/components/Copyable";
import { StatusPill } from "@/components/StatusPill";
import type { CarrierRow } from "@/lib/carriers";
import { formatPhone, operationLabel, padDot, recordStatus } from "@/lib/format";

type Props = {
  carrier: CarrierRow & { matched_on?: string | null };
};

export function CarrierResultRow({ carrier }: Props) {
  const status = recordStatus(carrier.authority_status, carrier.status_code);
  const mc = carrier.docket1 ? `${carrier.docket1prefix ?? "MC"} ${carrier.docket1}` : null;
  const asMc = carrier.matched_on === "mc";
  const place = [carrier.phy_city, carrier.phy_state].filter(Boolean).join(", ");

  return (
    <Link className="result" href={`/carriers/${carrier.dot_number}`}>
      <div className={`grade ${carrier.trust_grade ?? ""}`} aria-label={`Grade ${carrier.trust_grade ?? "unrated"}`}>
        {carrier.trust_grade ?? "–"}
      </div>
      <div className="result-body">
        <h2>
          {carrier.legal_name ? (
            <Copyable value={carrier.legal_name} className="name" title="Copy legal name" as="span">
              {carrier.legal_name}
            </Copyable>
          ) : (
            "Unnamed carrier"
          )}
        </h2>
        <div className="chips">
          <span className="chip accent">{asMc && mc ? mc : `USDOT ${padDot(carrier.dot_number)}`}</span>
          {asMc ? <span className="chip">DOT {padDot(carrier.dot_number)}</span> : mc ? <span className="chip">{mc}</span> : null}
          <StatusPill status={status} />
          {place ? <span className="chip">{place}</span> : null}
          {carrier.carrier_operation ? <span className="chip">{operationLabel(carrier.carrier_operation)}</span> : null}
          {carrier.insurance_cancel_pending ? <span className="pill warn">Cancellation pending</span> : null}
        </div>
        <dl className="result-meta">
          <div>
            <dt>Phone</dt>
            <dd>
              {carrier.phone ? (
                <Copyable value={carrier.phone} title="Copy phone" as="span">
                  {formatPhone(carrier.phone) ?? carrier.phone}
                </Copyable>
              ) : (
                <span className="meta-empty">Not listed</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>
              {carrier.email ? (
                <Copyable value={carrier.email} title="Copy email" as="span">
                  {carrier.email}
                </Copyable>
              ) : (
                <span className="meta-empty">Not listed</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{place || <span className="meta-empty">Not listed</span>}</dd>
          </div>
        </dl>
      </div>
      <div className="score-side">
        <b>{carrier.trust_score ?? "—"}</b>
        <span className="muted">trust / 100</span>
      </div>
    </Link>
  );
}
