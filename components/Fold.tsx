export function Fold({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <details className="fold">
      <summary>
        <span>{title}</span>
        {hint ? <em>{hint}</em> : null}
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}
