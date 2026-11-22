import Link from "next/link";
import { brand } from "@/lib/brand";

const lanes = [
  { title: "Dispatch help", body: "Need a truck covered or a lane watched — talk to the desk.", href: "/desk" },
  { title: "Authority / MC", body: "New authority, lease-on, or setup questions from Austin.", href: "/services/authority" },
  { title: "Fuel card", body: "Ask about the $6 fuel card offer when you call sales.", href: "/desk" },
];

export default function UiPreviewDeskPage() {
  return (
    <>
      <section className="uip-panel-card">
        <h1>Dispatcher desk</h1>
        <p>
          Preview of the desk landing — amber signal CTAs on asphalt panels. Live forms stay on production routes.
        </p>
        <div className="uip-cta-row">
          <a className="uip-btn uip-btn-primary" href={brand.phoneHref}>
            Call {brand.phone}
          </a>
          <a className="uip-btn uip-btn-ghost" href={`mailto:${brand.email}`}>
            Email the desk
          </a>
        </div>
      </section>

      <section className="uip-section">
        <h2>Desk lanes</h2>
        <p>Pick a path — preview styling only; links open the real pages.</p>
        <div className="uip-lane">
          {lanes.map((lane) => (
            <article key={lane.title}>
              <h3>{lane.title}</h3>
              <p>{lane.body}</p>
              <Link href={lane.href}>Continue</Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
