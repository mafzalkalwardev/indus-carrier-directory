import { brand } from "@/lib/brand";

export default function UiPreviewBrokersPage() {
  return (
    <section className="uip-panel-card">
      <h1>Check a broker</h1>
      <p>
        Preview shell for broker lookup — same asphalt desk language as the rest of this UI preview.
        Production broker tools stay at <a href="/brokers" style={{ color: "var(--uip-amber)" }}>/brokers</a>.
      </p>
      <form className="uip-stack" action="/brokers" method="get" aria-label="Preview broker search">
        <label className="uip-field">
          Broker name or MC
          <input name="q" placeholder="Broker name, MC…" />
        </label>
        <label className="uip-field">
          State
          <select name="state" defaultValue="">
            <option value="">Any</option>
            <option value="TX">TX</option>
            <option value="OK">OK</option>
            <option value="LA">LA</option>
          </select>
        </label>
        <button type="submit" className="uip-btn uip-btn-primary" style={{ width: "fit-content" }}>
          Search brokers
        </button>
      </form>
      <p style={{ marginTop: "1.25rem", color: "var(--uip-muted)", fontSize: "0.86rem" }}>
        Desk line: <a href={brand.phoneHref} style={{ color: "var(--uip-amber)" }}>{brand.phone}</a>
      </p>
    </section>
  );
}
