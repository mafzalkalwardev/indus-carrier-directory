import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { ServiceStrip } from "@/components/ServiceStrip";
import { StatusPill } from "@/components/StatusPill";
import { latestFeeds, stateIndex } from "@/lib/carriers";
import { operationLabel, padDot, recordStatus } from "@/lib/format";
import { countDirectory, filtersActive, readFilters, searchDirectory } from "@/lib/search";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    operation?: string;
    authority?: string;
    insurance?: string;
    vehicle?: string;
    state?: string;
    location?: string;
    find?: string;
  }>;
}) {
  const filters = readFilters(await searchParams);
  const searching = filtersActive(filters);
  let results: Awaited<ReturnType<typeof searchDirectory>> = [];
  let total = 0;
  let states: Awaited<ReturnType<typeof stateIndex>> = [];
  let censusLoaded: string | null = null;
  let error: string | null = null;

  try {
    if (searching) {
      [results, total] = await Promise.all([searchDirectory(filters), countDirectory(filters)]);
    } else {
      const [index, feeds] = await Promise.all([stateIndex(), latestFeeds()]);
      states = index;
      const census = feeds.find((feed) => feed.feed_key === "census");
      censusLoaded = census?.source_updated_at ?? census?.loaded_at ?? null;
    }
  } catch {
    error = "The directory database is not reachable. Start it with npm run db, then load data with npm run ingest.";
  }

  const carrierCount = states.reduce((sum, state) => sum + Number(state.count), 0);
  const ambiguous = results.some((carrier) => carrier.matched_on === "usdot" || carrier.matched_on === "both")
    && results.some((carrier) => carrier.matched_on === "mc");
  const censusDate = censusLoaded
    ? new Date(censusLoaded).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <main>
      <section className="hero">
        <p className="kicker">Carrier lookup</p>
        <h1>Check a carrier before the truck rolls</h1>
        <p className="lede">
          USDOT, MC, name, phone, or email, narrowed by a city or state in the same bar.
        </p>
        <SearchForm filters={filters} />
        {searching ? null : (
          <>
            <ul className="trust">
              <li>{carrierCount.toLocaleString()} carrier records</li>
              <li>{censusDate ? `Census file ${censusDate}` : "Nightly public files"}</li>
              <li>DOT, MC, name, phone, email</li>
            </ul>
            <div className="hero-links">
              <Link href="/loads">Find loads</Link>
              <Link href="/brokers">Check a broker</Link>
              <Link href="/desk">Dispatcher desk</Link>
              <Link href="/new/registered">New MCs today</Link>
            </div>
          </>
        )}
      </section>
      {searching ? null : <ServiceStrip />}
      {searching ? null : (
          <>
            <section className="info-block">
              <div className="result-bar">
                <h2 className="section-title">Partners</h2>
                <Link href="/services/factoring">Ask about RTS</Link>
              </div>
              <div className="partner-row">
                <article className="partner">
                  <span>Factoring</span>
                  <strong>RTS</strong>
                  <p>Same-day pay on invoices. INDUS sets the account up.</p>
                  <Link href="/services/factoring">Request RTS</Link>
                </article>
                <article className="partner">
                  <span>Fuel</span>
                  <strong>$6 a month</strong>
                  <p>Fuel as much as you need. Fifty cents off every gallon.</p>
                  <Link href="/services/fuel-cards">Request a fuel card</Link>
                </article>
              </div>
            </section>
            <section className="info-block">
              <h2 className="section-title">Two ways to move freight</h2>
              <div className="resource-grid">
                <Link className="resource" href="/lanes#carriers">
                  <strong>Search a dedicated lane</strong>
                  <p>Tell us the origin, the destination, and the trailer. We look for freight and direct shippers for that truck.</p>
                </Link>
                <Link className="resource" href="/lanes#shippers">
                  <strong>Shippers, book a contract</strong>
                  <p>Daily, weekly, monthly, or yearly capacity. Send the lane and the rhythm.</p>
                </Link>
              </div>
            </section>
            <section className="info-block">
              <div className="result-bar">
                <h2 className="section-title">Before you book</h2>
                <Link href="/faq">All questions</Link>
              </div>
              <div className="resource-grid">
                <Link className="resource" href="/faq#verify"><strong>How to read a carrier</strong><p>Authority, insurance, and inspections, then confirm on MOTUS or SAFER.</p></Link>
                <Link className="resource" href="/faq#dot-vs-mc"><strong>USDOT and MC</strong><p>One number is the safety identity. The other is the authority to haul for hire.</p></Link>
                <Link className="resource" href="/faq#fuel"><strong>Fuel card</strong><p>$6 a month, unlimited fueling, 50 cents off a gallon.</p></Link>
                <Link className="resource" href="/faq#lane"><strong>Lanes and schedules</strong><p>One truck on a lane, or a shipper on a daily to yearly contract.</p></Link>
              </div>
            </section>
          </>
        )}
      {error ? <p className="error">{error}</p> : null}
      {searching ? (
        <section className="results">
          <div className="result-bar">
            <span>
              {total.toLocaleString()} match{total === 1 ? "" : "es"}
              {results.length < total ? ` · showing ${results.length}` : ""}
            </span>
          </div>
          {ambiguous ? (
            <div className="callout">
              <strong>{filters.q.replace(/^0+/, "")} belongs to more than one carrier.</strong>
              <p>One record owns this USDOT number. Another uses it as an MC number. Open the one you meant.</p>
            </div>
          ) : null}
          {results.map((carrier) => {
            const status = recordStatus(carrier.authority_status, carrier.status_code);
            const mc = carrier.docket1 ? `${carrier.docket1prefix ?? "MC"} ${carrier.docket1}` : null;
            const asMc = carrier.matched_on === "mc";
            return (
              <Link className="result" key={carrier.dot_number} href={`/carriers/${carrier.dot_number}`}>
                <div className={`grade ${carrier.trust_grade ?? ""}`}>{carrier.trust_grade ?? "–"}</div>
                <div>
                  <h2>{carrier.legal_name ?? "Unnamed carrier"}</h2>
                  <div className="chips">
                    <span className="chip accent">{asMc && mc ? mc : `USDOT ${padDot(carrier.dot_number)}`}</span>
                    {asMc ? <span className="chip">DOT {padDot(carrier.dot_number)}</span> : mc ? <span className="chip">{mc}</span> : null}
                    <StatusPill status={status} />
                    {carrier.phy_city || carrier.phy_state ? (
                      <span className="chip">{[carrier.phy_city, carrier.phy_state].filter(Boolean).join(", ")}</span>
                    ) : null}
                    {carrier.carrier_operation ? <span className="chip">{operationLabel(carrier.carrier_operation)}</span> : null}
                    {carrier.insurance_cancel_pending ? <span className="pill warn">Cancellation pending</span> : null}
                  </div>
                </div>
                <div className="score-side">
                  <b>{carrier.trust_score ?? "—"}</b>
                  <span className="muted">/ 100</span>
                </div>
              </Link>
            );
          })}
        </section>
      ) : (
        <p className="hint">
          Newly registered MCs refresh nightly from FMCSA. Open the <a href="/desk">dispatcher desk</a> or the <a href="/new/registered">registered list</a>.
        </p>
      )}
    </main>
  );
}
