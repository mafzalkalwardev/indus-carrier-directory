import Link from "next/link";
import { availableLoads, readLoadQuery, TRAILER_CHOICES } from "@/lib/loads";
import { STATE_NAMES } from "@/lib/states";

export const metadata = { title: "Available loads" };

function detailHref(load: Awaited<ReturnType<typeof availableLoads>>["loads"][number]) {
  const params = new URLSearchParams({
    source: load.source,
    url: load.sourceUrl,
    pickup: load.pickup,
    origin: `${load.originCity}, ${load.originState}`,
    destination: `${load.destinationCity}, ${load.destinationState}`,
    equipment: load.equipment,
    weight: load.weight,
    size: load.size,
  });
  if (load.miles != null) params.set("miles", String(load.miles));
  if (load.rate) params.set("rate", load.rate);
  if (load.perMile) params.set("rpm", load.perMile);
  if (load.postedAge) params.set("age", load.postedAge);
  if (load.brokerName) params.set("broker", load.brokerName);
  if (load.brokerPhone) params.set("phone", load.brokerPhone);
  if (load.brokerEmail) params.set("email", load.brokerEmail);
  if (load.brokerDot) params.set("dot", load.brokerDot);
  if (load.brokerGrade) params.set("grade", load.brokerGrade);
  return `/loads/open?${params.toString()}`;
}

export default async function LoadsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; city?: string; equipment?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const asked = Boolean(params.state);
  const query = readLoadQuery(params);
  const { loads, notes } = asked ? await availableLoads(query) : { loads: [], notes: [] };
  const place = [query.city, query.state].filter(Boolean).join(", ");

  return (
    <main>
      <p className="kicker">Free load boards</p>
      <h1>Available loads</h1>
      <p className="lede">
        Live public listings from DOFT, Direct Freight, and C.H. Robinson when their search answers. TQL and Landstar keep the full list behind their own login. Broker phone, email, and grade are shown only when they are on the public census row.
      </p>
      <section className="info-block">
        <h2 className="section-title">Check a broker</h2>
        <p className="hint">Search an MC number or a broker name. This check uses the public FMCSA file.</p>
        <form className="search" action="/brokers" method="get">
          <div className="search-row">
            <label className="search-field">
              <span>Broker</span>
              <input name="q" placeholder="MC number or broker name" />
            </label>
            <button type="submit">Check</button>
          </div>
        </form>
      </section>
      <form className="filters load-filters" action="/loads" method="get">
        <label>
          Origin state
          <select name="state" defaultValue={query.state}>
            {Object.entries(STATE_NAMES).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          City
          <input name="city" defaultValue={query.city} placeholder="Houston" />
        </label>
        <label>
          Trailer
          <select name="equipment" defaultValue={query.equipment}>
            {TRAILER_CHOICES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select name="sort" defaultValue={query.sort}>
            <option value="age">Age, newest</option>
            <option value="rpm">Rate per mile</option>
            <option value="rate">Highest rate</option>
          </select>
        </label>
        <button type="submit">Show loads</button>
      </form>
      {asked ? (
        <>
      <div className="result-bar">
        <span>{loads.length.toLocaleString()} load{loads.length === 1 ? "" : "s"} from {place}</span>
        <span className="muted">DOFT · Direct Freight</span>
      </div>
      {notes.length ? <p className="hint">{notes.join(" ")}</p> : null}
      <div className="load-list">
        {loads.map((load) => (
          <Link className="load-card" key={load.id} href={detailHref(load)}>
            <div>
              <h2>{load.originCity}, {load.originState} → {load.destinationCity}, {load.destinationState}</h2>
              <div className="chips">
                <span className="chip accent">{load.source}</span>
                {load.brokerName ? <span className="chip">{load.brokerName}</span> : null}
                {load.brokerGrade ? <span className="chip">Grade {load.brokerGrade}</span> : null}
                <span className="chip">{load.equipment}</span>
                <span className="chip">{load.size}</span>
                <span className="chip">{load.weight}</span>
                {load.miles != null ? <span className="chip">{load.miles.toLocaleString()} mi</span> : null}
                <span className="chip">{load.pickup}</span>
                {load.postedAge ? <span className="chip">{load.postedAge}</span> : <span className="chip">Age not listed</span>}
              </div>
              {load.brokerPhone || load.brokerEmail ? (
                <p className="hint">
                  {load.brokerPhone}
                  {load.brokerEmail ? ` · ${load.brokerEmail}` : ""}
                  {load.brokerDot ? ` · DOT ${load.brokerDot}` : ""}
                </p>
              ) : null}
            </div>
            <div className="score-side">
              <b>{load.rate ?? "Rate on board"}</b>
              <span className="muted">{load.perMile ?? "Open to book"}</span>
            </div>
          </Link>
        ))}
      </div>
      {loads.length === 0 ? (
        <p className="lede">No public loads matched that search. Try the state without a city, or another trailer.</p>
      ) : null}
        </>
      ) : (
        <p className="hint">Nothing is listed until you choose a state and press Show loads.</p>
      )}
    </main>
  );
}
