import Link from "next/link";
import { notFound } from "next/navigation";
import { RequestSent, ServiceForm } from "@/components/ServiceForm";
import { brand } from "@/lib/brand";
import { offers, serviceById, serviceDetails } from "@/lib/offers";

export function generateStaticParams() {
  return offers.map((offer) => ({ id: offer.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const offer = serviceById((await params).id);
  return { title: offer?.title ?? "Service" };
}

export default async function ServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const { id } = await params;
  const offer = serviceById(id);
  const detail = serviceDetails[id];
  if (!offer || !detail) notFound();
  const sent = (await searchParams).sent === "1";
  const others = offers.filter((item) => item.id !== offer.id);

  return (
    <main>
      <p className="kicker"><Link href="/services">Services</Link> · {offer.note}</p>
      <h1>{offer.title}</h1>
      <p className="lede">{offer.detail}</p>
      <div className="service-layout">
        <section className="card">
          <h2>What you get</h2>
          <ul className="include-list">
            {detail.includes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="hint">Talk to sales at <a href={brand.phoneHref}>{brand.phone}</a>.</p>
        </section>
        <section className="card" id="request">
          <h2>Send the details</h2>
          {sent ? <RequestSent label={offer.label} /> : <ServiceForm id={offer.id} label={offer.label} fields={detail.fields} />}
        </section>
      </div>
      <section className="info-block">
        <h2 className="section-title">Other services</h2>
        <div className="service-others">
          {others.map((item) => (
            <Link key={item.id} href={`/services/${item.id}`}>{item.label}</Link>
          ))}
        </div>
      </section>
    </main>
  );
}
