import Link from "next/link";
import { searchBrokers } from "@/lib/brokers";
import { formatMoney, formatPhone, padDot } from "@/lib/format";

export const metadata = { title: "Broker check" };

export default async function BrokersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q?.trim() ?? "";
  let brokers: Awaited<ReturnType<typeof searchBrokers>> = [];
  let error: string | null = null;
  if (q.length >= 2) {
    try {
      brokers = await searchBrokers(q);
    } catch {
      error = "The directory database is not reachable.";
    }
  }

  return (
    <main>
      <p className="kicker">Before you book</p>
      <h1>Check a broker</h1>
      <p className="lede">
        Search an MC number or a broker name. The grade, authority, bond, phone, and email come from the public FMCSA file.
      </p>
      <form className="search" action="/brokers" method="get">
        <div className="search-row">
          <label className="search-field">
            <span>Broker</span>
            <input name="q" defaultValue={q} placeholder="MC number or broker name" autoComplete="off" />
          </label>
          <button type="submit">Check</button>
        </div>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {q.length >= 2 && !error ? (
        <section className="results">
          <p className="hint">{brokers.length} record{brokers.length === 1 ? "" : "s"}</p>
          {brokers.map((broker) => (
            <Link className="result" key={`${broker.dot_number}-${broker.docket_number}`} href={`/carriers/${broker.dot_number}`}>
              <div className={`grade ${broker.trust_grade ?? ""}`}>{broker.trust_grade ?? "–"}</div>
              <div>
                <h2>{broker.legal_name ?? "Unnamed broker"}</h2>
                <div className="chips">
                  <span className="chip accent">USDOT {padDot(broker.dot_number)}</span>
                  {broker.docket_number ? <span className="chip">{broker.docket_number}</span> : null}
                  <span className="chip">{broker.broker_authority_status ? `Broker ${broker.broker_authority_status}` : broker.authority_status ? `Authority ${broker.authority_status}` : "Authority not listed"}</span>
                  <span className="chip">{broker.bond_on_file ? "BMC-84/85 bond in the public file" : "No BMC-84/85 bond in the public file"}</span>
                  <span className="chip">{broker.insurance_current ? "Insurance on file" : "No current BIPD"}</span>
                  {broker.bipd_on_file ? <span className="chip">{formatMoney(broker.bipd_on_file)}</span> : null}
                  {broker.phy_city || broker.phy_state ? <span className="chip">{[broker.phy_city, broker.phy_state].filter(Boolean).join(", ")}</span> : null}
                </div>
                <p className="hint">
                  {broker.phone ? formatPhone(broker.phone) : "No public phone"}
                  {broker.email ? ` · ${broker.email}` : " · No public email"}
                  {broker.trust_score != null ? ` · Directory grade ${broker.trust_grade ?? "–"} ${broker.trust_score}/100` : ""}
                </p>
                {broker.authorities ? <p className="hint">{broker.authorities}</p> : null}
              </div>
            </Link>
          ))}
          {brokers.length === 0 ? <p>No public record matched that MC or name.</p> : null}
        </section>
      ) : null}
    </main>
  );
}
