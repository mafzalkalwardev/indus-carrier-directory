const FILES = [
  ["carriers", "Carriers", "One row per USDOT: name, authority, operation, insurance, and score. Add search filters on the home page to download a subset."],
  ["fleet", "Equipment counts", "Owned, term-leased, and trip-leased vehicle counts from the census, by type."],
  ["dockets", "Operating authority", "MOTUS docket status and BIPD on file."],
  ["authority", "Authority history", "Status changes, including grants and revocations."],
  ["insurance", "Insurance on file", "Active and pending policies."],
  ["cancellations", "Insurance history", "Prior policies and cancellation effective dates. A future date is a pending cancellation."],
  ["inspections", "Inspections", "Roadside inspections. This file is large."],
  ["vehicles", "Inspected vehicles", "VINs, makes, and plates seen on inspections. This is not a complete fleet inventory."],
  ["crashes", "Crashes", "Reportable crashes tied to a USDOT number. This file is large."],
];

export default function DownloadPage() {
  return (
    <main>
      <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 600 }}>Download public carrier data</h1>
      <p className="lede">
        Each file is the directory’s copy of an FMCSA open-data extract. A daily job reloads the files after FMCSA publishes them.
      </p>
      <ul className="plain-list">
        {FILES.map(([dataset, title, detail]) => (
          <li key={dataset}>
            <a href={`/api/export?dataset=${dataset}`}>{title} (CSV)</a>
            <div className="muted">{detail}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
