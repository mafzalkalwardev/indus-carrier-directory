import Link from "next/link";

export function PreviewBanner() {
  return (
    <aside className="uip-banner" role="status">
      <p>
        <strong>Preview only</strong> — production site is unchanged. Open{" "}
        <Link href="/">live home</Link> anytime. To reverse, delete{" "}
        <code>app/ui-preview</code> and <code>components/ui-preview</code>.
      </p>
    </aside>
  );
}
