import Link from "next/link";
import { notFound } from "next/navigation";
import { CarrierList } from "@/components/CarrierList";
import { carriersByCity } from "@/lib/carriers";
import { stateName } from "@/lib/states";

export async function generateMetadata({ params }: { params: Promise<{ state: string; city: string }> }) {
  const { state, city } = await params;
  return { title: `${decodeURIComponent(city)}, ${state.toUpperCase()}` };
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ state: string; city: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { state, city } = await params;
  const code = state.toUpperCase();
  const cityName = decodeURIComponent(city);
  if (!/^[A-Z]{2}$/.test(code)) notFound();
  const page = Math.max(1, Number((await searchParams).page ?? "1") || 1);
  let data: Awaited<ReturnType<typeof carriersByCity>>;
  try {
    data = await carriersByCity(code, cityName, page);
  } catch {
    return <p className="error">The directory database is not reachable.</p>;
  }
  if (data.total === 0) notFound();

  return (
    <main>
      <p className="crumbs">
        <Link href="/states">States</Link> / <Link href={`/states/${code}`}>{stateName(code)}</Link> / {cityName}
      </p>
      <h1 style={{ fontFamily: "Georgia, serif" }}>
        {cityName}, {code}
      </h1>
      <CarrierList
        carriers={data.rows}
        page={page}
        total={data.total}
        limit={data.limit}
        basePath={`/states/${code}/${encodeURIComponent(cityName)}`}
      />
    </main>
  );
}
