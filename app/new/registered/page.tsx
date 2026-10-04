import Link from "next/link";
import { RecentList } from "@/components/RecentList";
import { countRecent, recentCarriers } from "@/lib/recent";
import { readRange } from "@/lib/search";

export const metadata = { title: "New MC registrations" };

export default async function RegisteredPage({ searchParams }: { searchParams: Promise<{ page?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const range = readRange(params.from, params.to);
  const limit = 40;
  const [carriers, total] = await Promise.all([
    recentCarriers("registered", range, limit, (page - 1) * limit),
    countRecent("registered", range),
  ]);
  const pages = Math.max(1, Math.ceil(total / limit));
  const download = `/api/export?dataset=carriers&registered=1&from=${range.from}&to=${range.to}`;
  const href = (next: number) => `/new/registered?page=${next}&from=${range.from}&to=${range.to}`;
  return (
    <main>
      <p className="kicker">{range.from} to {range.to}</p>
      <h1>Registered MCs</h1>
      <p className="lede">
        MC numbers filed or published between these dates. {total.toLocaleString()} carriers.
        The directory refreshes nightly from FMCSA public files, so newly registered MCs show up automatically after each sync.
      </p>
      <form className="ticks" action="/new/registered" method="get">
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
