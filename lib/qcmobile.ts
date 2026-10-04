import { query } from "@/lib/db";

type QcCarrier = {
  allowedToOperate?: string | null;
  bipdInsuranceOnFile?: string | number | null;
  commonAuthorityStatus?: string | null;
  contractAuthorityStatus?: string | null;
  brokerAuthorityStatus?: string | null;
  oosDate?: string | null;
  safetyRating?: string | null;
  safetyRatingDate?: string | null;
};

function dollars(raw: string | number | null | undefined) {
  if (raw == null || raw === "") return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return null;
  if (amount <= 0) return "0";
  if (amount < 10000) return String(Math.round(amount * 1000));
  return String(Math.round(amount));
}

function authorityLabel(code: string | null | undefined) {
  if (!code) return null;
  const value = code.toUpperCase();
  if (value === "A") return "Active";
  if (value === "I") return "Inactive";
  if (value === "N") return "None";
  return code;
}

function dateOrNull(value: string | null | undefined) {
  if (!value || value === "null") return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : null;
}

const RATING: Record<string, string> = {
  S: "Satisfactory",
  C: "Conditional",
  U: "Unsatisfactory",
};

export async function refreshCarrierFromQcMobile(dot: string) {
  const webKey = process.env.FMCSA_WEBKEY?.trim();
  if (!webKey) {
    return {
      ok: false as const,
      error: "A live FMCSA refresh is not available right now. This page is using the daily public file.",
    };
  }

  const url = `https://mobile.fmcsa.dot.gov/qc/services/carriers/${encodeURIComponent(dot)}?webKey=${encodeURIComponent(webKey)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return { ok: false as const, error: `QCMobile returned HTTP ${response.status}.` };
  }

  const body = (await response.json()) as { content?: { carrier?: QcCarrier } };
  const carrier = body.content?.carrier;
  if (!carrier) {
    return { ok: false as const, error: "QCMobile did not return a carrier record." };
  }

  const rating = carrier.safetyRating ? RATING[carrier.safetyRating.toUpperCase()] ?? carrier.safetyRating : null;
  await query(
    `UPDATE carriers SET
       live_checked_at = now(),
       live_allowed_to_operate = $2,
       live_bipd_on_file = $3,
       live_common_authority = $4,
       live_contract_authority = $5,
       live_broker_authority = $6,
       live_oos_date = $7,
       live_safety_rating = $8,
       live_safety_rating_date = $9
     WHERE dot_number = $1`,
    [
      dot,
      carrier.allowedToOperate ?? null,
      dollars(carrier.bipdInsuranceOnFile),
      authorityLabel(carrier.commonAuthorityStatus),
      authorityLabel(carrier.contractAuthorityStatus),
      authorityLabel(carrier.brokerAuthorityStatus),
      dateOrNull(carrier.oosDate),
      rating,
      dateOrNull(carrier.safetyRatingDate),
    ],
  );
  await query(`SELECT recompute_carrier_scores($1)`, [dot]);
  return { ok: true as const };
}
