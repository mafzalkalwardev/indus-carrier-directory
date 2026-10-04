const FLEET_SIZE: Record<string, string> = {
  A: "1",
  B: "2–3",
  C: "4–6",
  D: "7–8",
  E: "9–11",
  F: "12–14",
  G: "15–17",
  H: "18–19",
  I: "20–23",
  J: "24–28",
  K: "29–32",
  L: "33–38",
  M: "39–44",
  N: "45–55",
  O: "56–75",
  P: "76–100",
  Q: "101–200",
  R: "201–300",
  S: "301–400",
  T: "401–550",
  U: "551–999",
  V: "1,000–2,000",
  W: "2,001–3,000",
  X: "3,001–4,000",
  Y: "4,001–5,000",
  Z: "5,001+",
};

const OPERATION: Record<string, string> = {
  A: "Interstate",
  B: "Intrastate hazmat",
  C: "Intrastate",
};

export function padDot(dot: string) {
  return dot.padStart(8, "0");
}

export function normalizeDot(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "");
  return digits;
}

export function formatPhone(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length !== 10) return value;
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

export function formatDate(value: string | Date | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatMoney(value: string | number | null) {
  if (value == null || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function formatNumber(value: number | string | null) {
  if (value == null || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return amount.toLocaleString("en-US");
}

export function fleetLabel(code: string | null) {
  if (!code) return "—";
  const label = FLEET_SIZE[code.toUpperCase()];
  return label ? `${code.toUpperCase()} · ${label} power units` : code;
}

export function recordStatus(authority: string | null, statusCode: string | null) {
  if (authority) return authority;
  if (statusCode === "A") return "Active";
  if (statusCode === "I") return "Inactive";
  if (statusCode === "P") return "Pending";
  return null;
}

export function operationLabel(code: string | null) {
  if (!code) return "—";
  return OPERATION[code.toUpperCase()] ?? code;
}

export function gradeLabel(grade: string | null) {
  switch (grade) {
    case "A":
      return "Excellent";
    case "B":
      return "Good";
    case "C":
      return "Fair";
    case "D":
      return "Caution";
    case "F":
      return "High risk";
    default:
      return "Unscored";
  }
}

export function pickAuthorityAgeDate(
  granted: string | Date | null | undefined,
  ...fallbacks: Array<string | Date | null | undefined>
) {
  for (const value of [granted, ...fallbacks]) {
    if (!value) continue;
    const start = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (!Number.isNaN(start.getTime())) return value;
  }
  return null;
}

export function authorityAge(granted: string | Date | null) {
  if (!granted) return "—";
  const start = granted instanceof Date ? granted : new Date(`${String(granted).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "—";
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 1) return "Less than 1 month";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years} year${years === 1 ? "" : "s"}, ${rem} month${rem === 1 ? "" : "s"}`;
}

export function ageBandLabel(granted: string | Date | null, authorityStatus: string | null) {
  if (authorityStatus === "Active" && !granted) return "Active authority, grant date not on file";
  if (!granted) return "No continuous authority date";
  const start = granted instanceof Date ? granted : new Date(`${String(granted).slice(0, 10)}T00:00:00`);
  const months = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.437);
  if (months < 6) return "1–6 months of continuous authority";
  if (months < 12) return "6–12 months of continuous authority";
  if (months < 24) return "1–2 years of continuous authority";
  if (months < 60) return "2–5 years of continuous authority";
  return "5 or more years of continuous authority";
}

export function percent(value: string | number | null) {
  if (value == null || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `${(amount * 100).toFixed(1)}%`;
}
