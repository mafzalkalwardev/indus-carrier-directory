import Link from "next/link";
import { CarrierResultRow } from "@/components/CarrierResultRow";
import { DeskForm } from "@/components/DeskForm";
import { RecentList } from "@/components/RecentList";
import { recentCarriers } from "@/lib/recent";
import { countDirectory, filterQuery, filtersActive, readFilters, searchDirectory } from "@/lib/search";

export const metadata = {
  title: "Dispatcher desk",
  description: "INDUS Transports dispatcher desk for dispatch help, authority and MC setup, fuel cards, and lane coverage from Austin, TX.",
  alternates: { canonical: "/desk" },
};

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
          {results.map((carrier) => (
            <CarrierResultRow key={carrier.dot_number} carrier={carrier} />
          ))}
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
