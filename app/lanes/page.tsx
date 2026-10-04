import Link from "next/link";
import { brand } from "@/lib/brand";

export const metadata = { title: "Lanes and shipper contracts" };

export default function LanesPage() {
  return (
    <main>
      <p className="kicker">Freight</p>
      <h1>A lane for the truck, or capacity for a shipper</h1>
      <p className="lede">
        Carriers can ask INDUS to cover one lane and to look for a direct shipper. Shippers can book trucks on a daily, weekly, monthly, or yearly contract.
      </p>
      <div className="service-grid">
        <section className="card" id="carriers">
          <p className="kicker">For carriers</p>
          <h2>Dedicated lane</h2>
          <p>Tell us where the truck should start, where it should finish, and what it pulls. We look for freight and direct shippers on that lane.</p>
          <p><Link className="button" href="/services/lane">Ask for this lane</Link></p>
          <p className="hint">You can also browse public load boards on the <Link href="/loads">loads page</Link>.</p>
        </section>
        <section className="card" id="shippers">
          <p className="kicker">For shippers</p>
          <h2>Contract capacity</h2>
          <p>If you move freight on a schedule, we can cover it every day, every week, every month, or for the year. Use the form and pick the rhythm.</p>
          <p><Link className="button" href="/services/shipper-contract">Book a schedule</Link></p>
          <p className="hint">Or call <a href={brand.phoneHref}>{brand.phone}</a>.</p>
        </section>
      </div>
    </main>
  );
}
