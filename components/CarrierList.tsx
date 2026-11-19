import Link from "next/link";
import { CarrierResultRow } from "@/components/CarrierResultRow";
import type { CarrierRow } from "@/lib/carriers";

export function CarrierList({
  carriers,
  page,
  total,
  limit,
  basePath,
}: {
  carriers: CarrierRow[];
  page: number;
  total: number;
  limit: number;
  basePath: string;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <section className="results">
      <div className="result-bar">
        <span>{total.toLocaleString()} carriers</span>
      </div>
      {carriers.map((carrier) => (
        <CarrierResultRow key={carrier.dot_number} carrier={carrier} />
      ))}
      <div className="pager">
        {page > 1 ? <Link href={`${basePath}?page=${page - 1}`}>Previous</Link> : null}
        {page < pages ? <Link href={`${basePath}?page=${page + 1}`}>Next</Link> : null}
      </div>
    </section>
  );
}
