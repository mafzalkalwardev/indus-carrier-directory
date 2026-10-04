import Link from "next/link";
import { RecentList } from "@/components/RecentList";
import { countRecent, recentCarriers } from "@/lib/recent";
import { readRange } from "@/lib/search";

export const metadata = { title: "Activated and reinstated MCs" };

export default async function ActivatedPage({ searchParams }: { searchParams: Promise<{ page?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const range = readRange(params.from, params.to);
  const limit = 40;
  const [carriers, total] = await Promise.all([
    recentCarriers("activated", range, limit, (page - 1) * limit),
    countRecent("activated", range),
  ]);
  const pages = Math.max(1, Math.ceil(total / limit));
  const download = `/api/export?dataset=carriers&activated=1&reinstated=1&from=${range.from}&to=${range.to}`;
  const href = (next: number) => `/new/activated?page=${next}&from=${range.from}&to=${range.to}`;
  return (
    <main>
      <p className="kicker">{range.from} to {range.to}</p>
      <h1>Activated and reinstated MCs</h1>
      <p className="lede">
        Authority granted or restored between these dates. {total.toLocaleString()} carriers.
      </p>
      <form className="ticks" action="/new/activated" method="get">
        <label>From <input type="date" name="from" defaultValue={range.from} /></label>
        <label>To <input type="date" name="to" defaultValue={range.to} /></label>
        <button type="submit">Show</button>
        <a className="button" href={download}>Download CSV</a>
      </form>
      <RecentList carriers={carriers} />
      <div className="pager">
        {page > 1 ? <Link href={href(page - 1)}>Previous</Link> : null}
        <span className="muted">Page {page} of {pages}</span>
        {page < pages ? <Link href={href(page + 1)}>Next</Link> : null}
      </div>
    </main>
  );
}
