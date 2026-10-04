import Link from "next/link";
import { brand } from "@/lib/brand";
import { offers } from "@/lib/offers";
import { Disclaimer } from "@/components/Disclaimer";

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="site-foot-band">
        <div className="foot-brand">
          <img src="/indus-mark.jpg" alt="" width={44} height={44} />
          <div>
            <strong>{brand.legal}</strong>
            <p>Dispatch, lookup, and setup from {brand.place}.</p>
          </div>
        </div>
        <a className="foot-call" href={brand.phoneHref}>Talk to sales · {brand.phone}</a>
      </div>
      <div className="site-foot-inner">
        <div>
          <h2>Look up</h2>
          <Link href="/">Directory</Link>
          <Link href="/loads">Loads</Link>
          <Link href="/brokers">Broker check</Link>
          <Link href="/states">States</Link>
          <Link href="/desk">Dispatcher desk</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/lanes">Lanes</Link>
          <Link href="/services/dispatch">Contact</Link>
        </div>
        <div>
          <h2>Setup</h2>
          {offers.filter((offer) => ["dispatch", "authority", "mc-lease", "fuel-cards", "drivers", "fmcsa-portal"].includes(offer.id)).map((offer) => (
            <Link key={offer.id} href={`/services/${offer.id}`}>{offer.label}</Link>
          ))}
        </div>
        <div>
          <h2>Fleet</h2>
          {offers.filter((offer) => ["truck-lease", "trailer-rental", "buy-truck", "dispatch-portal", "social"].includes(offer.id)).map((offer) => (
            <Link key={offer.id} href={`/services/${offer.id}`}>{offer.label}</Link>
          ))}
        </div>
        <div>
          <h2>Freight</h2>
          {offers.filter((offer) => ["factoring", "eld", "insurance", "lane", "shipper-contract"].includes(offer.id)).map((offer) => (
            <Link key={offer.id} href={`/services/${offer.id}`}>{offer.label}</Link>
          ))}
        </div>
        <div className="foot-note">
          <h2>Records</h2>
          <p>
            A profile shows the public FMCSA file: authority, insurance, equipment, and safety. The dispatcher desk is the place for new MCs and a dated CSV.
          </p>
          <p><a href={`mailto:${brand.email}`}>{brand.email}</a></p>
        </div>
      </div>
      <div className="site-foot-base">
        <Disclaimer />
        <p>© {new Date().getFullYear()} {brand.legal} · {brand.place}</p>
      </div>
    </footer>
  );
}
