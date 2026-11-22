import Link from "next/link";
import { Copyable } from "@/components/Copyable";
import { formatPhone } from "@/lib/format";
import { getLoadDetail } from "@/lib/laneora";
import { getCachedLiveLoad } from "@/lib/live-load-cache";

export const metadata = { title: "Load detail" };

export default async function LoadDetailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const searchId = params.search_id?.trim() ?? "";
  const matchId = (params.match_id ?? params.id ?? "").trim();
  const wantsLive = Boolean(searchId && matchId);
  const cached = wantsLive ? getCachedLiveLoad(searchId, matchId) : null;

  let boardDetail: Awaited<ReturnType<typeof getLoadDetail>> | null = null;
  if (wantsLive) {
    try {
      boardDetail = await getLoadDetail(searchId, matchId);
    } catch {
      boardDetail = null;
    }
  }

  const origin = cached
    ? `${cached.originCity}, ${cached.originState}`
    : (params.origin ?? "Origin not listed");
  const destination = cached
    ? `${cached.destinationCity}, ${cached.destinationState}`
    : (params.destination ?? "Destination not listed");
  const broker = (cached?.brokerName ?? params.broker)?.trim() ?? "";
  const phone = cached?.brokerPhone ?? "";
  const email = cached?.brokerEmail ?? "";
  const rate = cached?.rate ?? params.rate ?? "";
  const rpm = cached?.perMile ?? params.rpm ?? "";
  const miles = cached?.miles != null ? String(cached.miles) : (params.miles ?? "");
  const equipment = cached?.equipment ?? params.equipment ?? "";
  const weight = cached?.weight ?? params.weight ?? "";
  const length = cached?.lengthFt != null ? String(cached.lengthFt) : (params.length ?? "");
  const pickup = cached?.pickup ?? params.pickup ?? "";
  const age = cached?.ageShort ?? cached?.postedAge ?? params.age ?? "";
  const credit = cached?.creditScore != null
    ? String(cached.creditScore)
    : (cached?.brokerGrade ?? params.credit ?? params.grade ?? "");
  const daysToPay = cached?.daysToPay != null ? String(cached.daysToPay) : (params.days_to_pay ?? "");
  const comments = cached?.comments?.join(" · ") || cached?.notes || "";
  const dh = cached?.originDeadhead;
  const dotNumber = boardDetail?.dot?.dot_number || params.dot || "";
  const brokerMc = boardDetail?.dot?.broker_mc || "";

  return (
    <main className="dat-detail">
      <p className="dat-detail-crumb"><Link href="/loads">← Search loads</Link></p>
      <header className="dat-detail-head">
        <div>
          <p className="dat-detail-age">{age || "Age —"}</p>
          <h1>{origin} → {destination}</h1>
        </div>
        <div className="dat-detail-rate">
          <b>{rate || "Rate on board"}</b>
          <span>{rpm || "—"}{miles ? ` · ${Number(miles).toLocaleString()} mi` : ""}</span>
        </div>
      </header>

      <div className="dat-detail-grid">
        <section>
          <h2>Shipment</h2>
          <dl className="dat-dl">
            <div><dt>Pickup</dt><dd>{pickup || "—"}</dd></div>
            <div><dt>Origin</dt><dd>{origin}{dh != null ? ` (${dh} DH)` : ""}</dd></div>
            <div><dt>Destination</dt><dd>{destination}</dd></div>
            <div><dt>Equipment</dt><dd>{equipment || "—"}</dd></div>
            <div><dt>Length</dt><dd>{length ? `${length} ft` : "—"}</dd></div>
            <div><dt>Weight</dt><dd>{weight || "—"}</dd></div>
            <div><dt>Trip</dt><dd>{miles ? `${Number(miles).toLocaleString()} mi` : "—"}</dd></div>
          </dl>
          {comments ? <p className="dat-detail-comments">{comments}</p> : null}
        </section>
        <section>
          <h2>Company</h2>
          {broker ? (
            <>
              <p className="dat-detail-broker">
                <Copyable value={broker} title="Copy company">{broker}</Copyable>
              </p>
              <dl className="dat-dl">
                <div>
                  <dt>Phone</dt>
                  <dd>
                    {phone ? (
                      <Copyable value={phone} title="Copy phone">{formatPhone(phone) ?? phone}</Copyable>
                    ) : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>
                    {email ? <Copyable value={email} title="Copy email">{email}</Copyable> : "—"}
                  </dd>
                </div>
                <div><dt>Credit</dt><dd>{credit || "—"}</dd></div>
                <div><dt>Days to pay</dt><dd>{daysToPay || "—"}</dd></div>
                {dotNumber ? <div><dt>DOT</dt><dd>{dotNumber}</dd></div> : null}
                {brokerMc ? <div><dt>Broker MC</dt><dd>{brokerMc}</dd></div> : null}
              </dl>
              {dotNumber ? <p><Link href={`/carriers/${dotNumber}`}>Open carrier record</Link></p> : null}
            </>
          ) : (
            <p className="hint">
              {wantsLive && !cached
                ? "Open this load again from search results to see company contact."
                : "Company not listed on this row."}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
