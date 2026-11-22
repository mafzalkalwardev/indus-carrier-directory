import Link from "next/link";
import { CarrierResultRow } from "@/components/CarrierResultRow";
import { SearchForm } from "@/components/SearchForm";
import { ServiceStrip } from "@/components/ServiceStrip";
import { latestFeeds, stateIndex } from "@/lib/carriers";
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
    error = process.env.DATABASE_URL
      ? "The directory database is empty or still loading. Carrier records will appear after the FMCSA ingest finishes."
      : "The directory database is not reachable. Start it with npm run db, then load data with npm run ingest.";
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
          INDUS Transports is an FMCSA carrier directory and dispatcher desk for carriers, brokers, and shippers.
          Search USDOT, MC, name, phone, or email, then open loads, broker checks, and desk tools from Austin, TX.
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
            <section className="info-block" aria-labelledby="what-is-indus">
              <h2 className="section-title" id="what-is-indus">What is INDUS Transports?</h2>
              <p>
                INDUS Transports LLC runs a public carrier directory built from FMCSA files, plus a live load board search
                and a dispatcher desk. Dispatchers and shippers look up a DOT or MC, check authority and insurance signals,
                then move on to loads, brokers, or setup help without leaving the site.
              </p>
            </section>
            <section className="info-block" aria-labelledby="what-can-indus-do">
              <h2 className="section-title" id="what-can-indus-do">What can INDUS Transports do?</h2>
              <div className="resource-grid">
                <Link className="resource" href="/">
                  <strong>Look up carriers</strong>
                  <p>Search USDOT, MC, legal name, phone, or email and open a profile with authority and insurance context.</p>
                </Link>
                <Link className="resource" href="/loads">
                  <strong>Search loads</strong>
                  <p>Run origin, equipment, length, and age filters on the live board and expand a row for booking contact.</p>
                </Link>
                <Link className="resource" href="/brokers">
                  <strong>Check brokers</strong>
                  <p>Confirm who you are booking with before you send a rate confirmation.</p>
                </Link>
                <Link className="resource" href="/desk">
                  <strong>Use the desk</strong>
                  <p>Ask for dispatch, authority help, fuel card setup, or lane coverage from the Austin desk.</p>
                </Link>
              </div>
            </section>
            <section className="info-block" aria-labelledby="who-is-indus-for">
              <h2 className="section-title" id="who-is-indus-for">Who is INDUS Transports for?</h2>
              <p>
                Owner-operators, fleet dispatchers, brokers, and shippers who need a fast FMCSA lookup before a truck rolls,
                plus a desk that can help with loads, authority, and fuel.
              </p>
            </section>
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
          {results.map((carrier) => (
            <CarrierResultRow key={carrier.dot_number} carrier={carrier} />
          ))}
        </section>
      ) : (
        <p className="hint">
          Newly registered MCs refresh nightly from FMCSA. Open the <a href="/desk">dispatcher desk</a> or the <a href="/new/registered">registered list</a>.
        </p>
      )}
    </main>
  );
}
