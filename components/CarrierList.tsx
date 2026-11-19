import Link from "next/link";
import { Copyable } from "@/components/Copyable";
import { StatusPill } from "@/components/StatusPill";
import type { CarrierRow } from "@/lib/carriers";
import { formatPhone, padDot, recordStatus } from "@/lib/format";

export function CarrierList({
  carriers,
  page,
  total,
  limit,
  basePath,
}: {
  carriers: CarrierRow[];
  page: number;
  total: number;
  limit: number;
  basePath: string;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <section className="results">
      <p className="muted">{total.toLocaleString()} carriers</p>
      {carriers.map((carrier) => (
        <Link className="result" key={carrier.dot_number} href={`/carriers/${carrier.dot_number}`}>
          <div className={`grade ${carrier.trust_grade ?? ""}`}>{carrier.trust_grade ?? "–"}</div>
          <div>
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
              <span className="chip accent">USDOT {padDot(carrier.dot_number)}</span>
              <StatusPill status={recordStatus(carrier.authority_status, carrier.status_code)} />
              {carrier.phy_city || carrier.phy_state ? (
                <span className="chip">{[carrier.phy_city, carrier.phy_state].filter(Boolean).join(", ")}</span>
              ) : null}
            </div>
            {carrier.phone || carrier.email ? (
              <div className="contact-inline">
                {carrier.phone ? (
                  <Copyable value={carrier.phone} title="Copy phone" as="span">
                    {formatPhone(carrier.phone) ?? carrier.phone}
                  </Copyable>
                ) : null}
                {carrier.email ? (
                  <Copyable value={carrier.email} title="Copy email" as="span">
                    {carrier.email}
                  </Copyable>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="muted">{carrier.trust_score ?? "—"} / 100</div>
        </Link>
      ))}
      <div className="pager">
        {page > 1 ? <Link href={`${basePath}?page=${page - 1}`}>Previous</Link> : null}
        {page < pages ? <Link href={`${basePath}?page=${page + 1}`}>Next</Link> : null}
      </div>
    </section>
  );
}
