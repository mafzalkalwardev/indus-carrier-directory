import Link from "next/link";
import { DeskForm } from "@/components/DeskForm";
import { RecentList } from "@/components/RecentList";
import { StatusPill } from "@/components/StatusPill";
import { operationLabel, padDot, recordStatus } from "@/lib/format";
import { recentCarriers } from "@/lib/recent";
import { countDirectory, filterQuery, filtersActive, readFilters, searchDirectory } from "@/lib/search";

export const metadata = { title: "Dispatcher desk" };

export default async function DeskPage({
  searchParams,
}: {
  searchParams: Promise<{
    operation?: string;
    authority?: string;
    insurance?: string;
    vehicle?: string;
    location?: string;
    registered?: string;
    activated?: string;
    reinstated?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const filters = readFilters(await searchParams);
  const searching = filtersActive(filters);
  let results: Awaited<ReturnType<typeof searchDirectory>> = [];
  let total = 0;
  let newest: Awaited<ReturnType<typeof recentCarriers>> = [];
  let error: string | null = null;
  try {
    if (searching) {
      [results, total] = await Promise.all([searchDirectory(filters), countDirectory(filters)]);
    } else {
      newest = await recentCarriers("registered", undefined, 12);
    }
  } catch {
    error = "The directory database is not reachable.";
  }
  const download = filterQuery(filters);
  download.set("dataset", "carriers");

  return (
    <main>
      <p className="kicker">For dispatchers</p>
      <h1>New MCs and bulk lists</h1>
      <p className="lede">
        Pick registered, activated, or reinstated, set the dates, and download that set. The public search on the home page stays a simple carrier lookup.
      </p>
      <DeskForm filters={filters} />
      <p className="hint">
        <Link href="/new/registered">Registered list</Link>
        {" · "}
        <Link href="/new/activated">Activated and reinstated</Link>
        {" · "}
        <Link href="/download">Full file downloads</Link>
      </p>
      {error ? <p className="error">{error}</p> : null}
      {searching ? (
        <section className="results">
          <div className="result-bar">
            <span>{total.toLocaleString()} match{total === 1 ? "" : "es"}{results.length < total ? ` · showing ${results.length}` : ""}</span>
            <a href={`/api/export?${download.toString()}`}>Download CSV</a>
          </div>
          {results.map((carrier) => {
            const status = recordStatus(carrier.authority_status, carrier.status_code);
            const mc = carrier.docket1 ? `${carrier.docket1prefix ?? "MC"} ${carrier.docket1}` : null;
            return (
              <Link className="result" key={carrier.dot_number} href={`/carriers/${carrier.dot_number}`}>
                <div className={`grade ${carrier.trust_grade ?? ""}`}>{carrier.trust_grade ?? "–"}</div>
                <div>
                  <h2>{carrier.legal_name ?? "Unnamed carrier"}</h2>
                  <div className="chips">
                    <span className="chip accent">USDOT {padDot(carrier.dot_number)}</span>
                    {mc ? <span className="chip">{mc}</span> : null}
                    <StatusPill status={status} />
                    {carrier.phy_city || carrier.phy_state ? (
                      <span className="chip">{[carrier.phy_city, carrier.phy_state].filter(Boolean).join(", ")}</span>
                    ) : null}
                    {carrier.carrier_operation ? <span className="chip">{operationLabel(carrier.carrier_operation)}</span> : null}
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
        <section className="snap" style={{ marginTop: 18 }}>
          <div className="result-bar">
            <h2 className="section-title">Newly registered MCs</h2>
            <Link href="/new/registered">Full list</Link>
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            Pulled from the nightly FMCSA sync. New filings appear here after the daily refresh.
          </p>
          <RecentList carriers={newest} />
        </section>
      )}
    </main>
  );
}
