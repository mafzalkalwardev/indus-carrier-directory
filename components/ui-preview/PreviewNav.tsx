"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { brand } from "@/lib/brand";

const links = [
  { href: "/ui-preview", label: "Directory", exact: true },
  { href: "/ui-preview/loads", label: "Loads" },
  { href: "/ui-preview/brokers", label: "Brokers" },
  { href: "/ui-preview/desk", label: "Desk" },
];

export function PreviewNav() {
  const path = usePathname();

  return (
    <header className="uip-nav">
      <div className="uip-nav-inner">
        <Link className="uip-brand" href="/ui-preview">
          <span className="uip-mark" aria-hidden="true">
            I
          </span>
          <span className="uip-wordmark">
            {brand.name}
            <em>Transports</em>
          </span>
        </Link>
        <nav className="uip-links" aria-label="Preview primary">
          {links.map((item) => {
            const active = item.exact ? path === item.href : path.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <a className="uip-nav-call" href={brand.phoneHref}>
          {brand.phone}
        </a>
      </div>
    </header>
  );
}
