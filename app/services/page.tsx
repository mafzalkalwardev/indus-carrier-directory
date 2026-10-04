import Link from "next/link";
import { redirect } from "next/navigation";
import { brand } from "@/lib/brand";
import { offers, serviceById } from "@/lib/offers";

export const metadata = { title: "Services" };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ sent?: string; want?: string }> }) {
  const { sent, want } = await searchParams;
  if (want && serviceById(want)) redirect(`/services/${want}`);

  return (
    <main>
      <p className="kicker">{brand.place}</p>
      <h1>What INDUS sets up</h1>
      <p className="lede">
        Open a service to see what is included and send the details for that one thing.
        Talk to sales at <a href={brand.phoneHref}>{brand.phone}</a>.
      </p>
      {sent === "1" ? <p className="success" role="status">Sent. INDUS has the request.</p> : null}
      <div className="service-grid">
        {offers.map((offer) => (
          <Link className="card service-card" id={offer.id} key={offer.id} href={`/services/${offer.id}`}>
            <p className="kicker">{offer.note}</p>
            <h2>{offer.title}</h2>
            <p>{offer.text}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
