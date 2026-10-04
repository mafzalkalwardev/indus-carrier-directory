import Link from "next/link";
import { offers } from "@/lib/offers";

export function ServiceStrip() {
  return (
    <section className="snapshot-row" aria-label="INDUS services">
      {offers.map((offer) => (
        <Link className="snapshot" key={offer.id} href={`/services/${offer.id}`}>
          <span>{offer.note}</span>
          <strong>{offer.title}</strong>
          <p>{offer.text}</p>
        </Link>
      ))}
    </section>
  );
}
