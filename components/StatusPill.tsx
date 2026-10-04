export function StatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  const normalized = status.trim().toLowerCase();
  const tone =
    normalized === "active" || normalized.endsWith(" active")
      ? "good"
      : normalized === "pending" || normalized.endsWith(" pending")
        ? "warn"
        : normalized === "inactive" || normalized.endsWith(" inactive") || normalized === "not authorized"
          ? "bad"
          : "neutral";
  return <span className={`pill ${tone}`}>{status}</span>;
}
