import Link from "next/link";
import { brand } from "@/lib/brand";

export default function UiPreviewHomePage() {
  return (
    <>
      <section className="uip-hero" aria-label="INDUS preview hero">
        <p className="uip-hero-brand">{brand.name}</p>
        <h1>Check the carrier. Book the load. Keep the desk moving.</h1>
        <p className="uip-lede">
          Freight lookup and live board search in one place — built for dispatchers who need answers before the truck rolls.
        </p>
        <div className="uip-cta-row">
          <Link className="uip-btn uip-btn-primary" href="/ui-preview/loads">
            Search loads
          </Link>
          <Link className="uip-btn uip-btn-ghost" href="#lookup">
            Look up a carrier
          </Link>
        </div>
      </section>

      <section className="uip-section" id="lookup">
        <h2>Carrier lookup</h2>
        <p>USDOT, MC, name, phone, or email — narrow by city or state in the same bar.</p>
        <form className="uip-search" action="/" method="get" aria-label="Preview carrier search">
          <label>
            Search
            <input name="q" placeholder="USDOT, MC, name, phone…" defaultValue="" />
          </label>
          <label>
            Where
            <input name="location" placeholder="Austin, TX" defaultValue="" />
          </label>
          <button type="submit" className="uip-btn uip-btn-primary">
            Search
          </button>
        </form>
        <ul className="uip-trust">
          <li>Public FMCSA files</li>
          <li>DOT · MC · name · phone · email</li>
          <li>{brand.place} desk</li>
        </ul>
      </section>

      <section className="uip-section">
        <h2>What the desk runs on</h2>
        <p>Same tools as production — restyled for this preview only.</p>
        <div className="uip-lane">
          <article>
            <h3>Loads</h3>
            <p>DAT-style search with equipment, length, age, and in-row details.</p>
            <Link href="/ui-preview/loads">Open loads preview</Link>
          </article>
          <article>
            <h3>Brokers</h3>
            <p>Check a broker before you book — credit and contact at a glance.</p>
            <Link href="/ui-preview/brokers">Open brokers preview</Link>
          </article>
          <article>
            <h3>Desk</h3>
            <p>Dispatch intake, authority help, and sales handoff from one board.</p>
            <Link href="/ui-preview/desk">Open desk preview</Link>
          </article>
        </div>
      </section>
    </>
  );
}
