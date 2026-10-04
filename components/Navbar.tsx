"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { brand } from "@/lib/brand";
import { offers } from "@/lib/offers";

const primary = [
  { href: "/", label: "Directory", test: (path: string) => path === "/" || path.startsWith("/carriers") },
  { href: "/loads", label: "Loads", test: (path: string) => path.startsWith("/loads") },
  { href: "/brokers", label: "Brokers", test: (path: string) => path.startsWith("/brokers") },
  { href: "/desk", label: "Desk", test: (path: string) => path.startsWith("/desk") || path.startsWith("/new") || path.startsWith("/download") },
  { href: "/states", label: "States", test: (path: string) => path.startsWith("/states") },
];

function current(path: string, test: (path: string) => boolean) {
  return test(path) ? "page" as const : undefined;
}

export function Navbar() {
  const path = usePathname();
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link className="brand" href="/">
          <img className="logo-mark" src="/indus-mark.jpg" alt="" width={40} height={40} />
          <span className="wordmark">
            {brand.name}
            <em>Transports</em>
          </span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          {primary.map((item) => (
            <Link key={item.href} href={item.href} aria-current={current(path, item.test)}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="nav-tools">
          <a href={brand.phoneHref}>{brand.phone}</a>
          <details className="nav-services">
            <summary className={path.startsWith("/services") ? "is-current" : undefined}>Services</summary>
            <div className="nav-panel">
              {offers.map((item) => (
                <Link key={item.id} href={`/services/${item.id}`}>
                  {item.label}
                  <span>{item.note}</span>
                </Link>
              ))}
            </div>
          </details>
          <Link className="nav-cta" href="/services/dispatch">Dispatch</Link>
        </div>
        <details className="nav-mobile">
          <summary>Menu</summary>
          <div className="nav-panel">
            {primary.map((item) => (
              <Link key={item.href} href={item.href} aria-current={current(path, item.test)}>
                {item.label}
              </Link>
            ))}
            <a href={brand.phoneHref}>Talk to sales {brand.phone}</a>
            {offers.map((item) => (
              <Link key={item.id} href={`/services/${item.id}`}>
                {item.label}
                <span>{item.note}</span>
              </Link>
            ))}
          </div>
        </details>
      </div>
    </header>
  );
}
