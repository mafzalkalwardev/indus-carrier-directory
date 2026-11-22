import Link from "next/link";
import { brand } from "@/lib/brand";

export function PreviewFooter() {
  return (
    <footer className="uip-foot">
      <div className="uip-foot-inner">
        <div>
          <strong className="uip-foot-brand">{brand.legal}</strong>
          <p>Dispatch desk · carrier lookup · loads · {brand.place}</p>
        </div>
        <div className="uip-foot-links">
          <Link href="/ui-preview">Directory</Link>
          <Link href="/ui-preview/loads">Loads</Link>
          <Link href="/ui-preview/brokers">Brokers</Link>
          <Link href="/ui-preview/desk">Desk</Link>
          <a href={brand.phoneHref}>{brand.phone}</a>
        </div>
      </div>
    </footer>
  );
}
