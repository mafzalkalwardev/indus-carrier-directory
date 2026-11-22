import Link from "next/link";
import { PostLoadForm } from "@/components/PostLoadForm";

export const metadata = { title: "Post a load" };

export default function PostLoadPage() {
  return (
    <main>
      <p className="kicker"><Link href="/loads">Loads</Link></p>
      <h1>Post a desk load</h1>
      <p className="lede">
        Admin-only. Posts land on the public Loads board under Indus or Laneora desk. This does not scrape DAT or open a Laneora session.
      </p>
      <section className="info-block">
        <h2 className="section-title">New load</h2>
        <p className="hint">Use the LOADS_ADMIN_KEY from the server env. The key stays in this browser session only.</p>
        <PostLoadForm />
      </section>
    </main>
  );
}
