import Link from "next/link";

export const metadata = { title: "Load" };

export default async function LoadDetailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const load = await searchParams;
  const origin = load.origin ?? "Origin not listed";
  const destination = load.destination ?? "Destination not listed";
  const broker = load.broker?.trim() ?? "";

  return (
    <main>
      <p className="kicker"><Link href="/loads">Loads</Link></p>
      <h1>{origin} → {destination}</h1>
      <p className="lede">{load.source ?? "Public board"} · {load.age ?? "Age not listed"}</p>
      <section className="snap">
        <h2>Load</h2>
        <div className="facts">
          <div className="fact"><span>Pickup</span><b>{load.pickup || "—"}</b></div>
          <div className="fact"><span>Origin</span><b>{origin}</b></div>
          <div className="fact"><span>Destination</span><b>{destination}</b></div>
          <div className="fact"><span>Trailer</span><b>{load.equipment || "—"}</b></div>
          <div className="fact"><span>Length</span><b>{load.size || "—"}</b></div>
          <div className="fact"><span>Weight</span><b>{load.weight || "—"}</b></div>
          <div className="fact"><span>Miles</span><b>{load.miles ? `${Number(load.miles).toLocaleString()} mi` : "—"}</b></div>
          <div className="fact"><span>Rate</span><b>{load.rate || "Not on the public row"}</b></div>
          <div className="fact"><span>Per mile</span><b>{load.rpm || "Not on the public row"}</b></div>
          <div className="fact"><span>Posted</span><b>{load.age || "Not listed"}</b></div>
        </div>
        {load.url ? <p><a href={load.url} target="_blank" rel="noreferrer">Open this load on {load.source ?? "the board"}</a></p> : null}
      </section>
      <section className="snap">
        <h2>Broker</h2>
        {broker ? (
          <>
            <p><strong>{broker}</strong>{load.grade ? ` · Grade ${load.grade}` : ""}</p>
            <p className="hint">
              {load.phone || "No public phone on this row"}
              {load.email ? ` · ${load.email}` : " · No public email on this row"}
              {load.dot ? ` · DOT ${load.dot}` : ""}
            </p>
            {load.dot ? <p><Link href={`/carriers/${load.dot}`}>Open the broker record</Link></p> : null}
            <p><Link href={`/brokers?q=${encodeURIComponent(broker)}`}>Run a broker check</Link></p>
          </>
        ) : (
          <p className="hint">This public row does not name the broker. Search the MC on the broker check if you have it.</p>
        )}
      </section>
    </main>
  );
}
