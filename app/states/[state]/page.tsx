import Link from "next/link";
import { notFound } from "next/navigation";
import { CarrierList } from "@/components/CarrierList";
import { carriersByState } from "@/lib/carriers";
import { stateName } from "@/lib/states";

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  return { title: stateName(state) };
}

export default async function StatePage({
  params,
  searchParams,
}: {
  params: Promise<{ state: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { state } = await params;
  const code = state.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) notFound();
  const page = Math.max(1, Number((await searchParams).page ?? "1") || 1);
  let data: Awaited<ReturnType<typeof carriersByState>>;
  try {
    data = await carriersByState(code, page);
  } catch {
    return <p className="error">The directory database is not reachable.</p>;
  }
  if (data.total === 0) notFound();

  return (
    <main>
      <p className="crumbs">
        <Link href="/states">States</Link> / {stateName(code)}
      </p>
      <h1 style={{ fontFamily: "Georgia, serif" }}>{stateName(code)}</h1>
      <CarrierList
        carriers={data.rows}
        page={page}
        total={data.total}
        limit={data.limit}
        basePath={`/states/${code}`}
      />
    </main>
  );
}
