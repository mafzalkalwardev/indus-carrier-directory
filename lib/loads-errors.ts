/** Stable error codes: helper → Next → UI → watchdog. */
export const LoadsErrorCode = {
  BAD_BODY: "BAD_BODY",
  RATE_LIMIT: "RATE_LIMIT",
  UNAUTHORIZED: "UNAUTHORIZED",
  ORIGIN: "ORIGIN",
  DESTINATION: "DESTINATION",
  TIMEOUT: "TIMEOUT",
  BOARD_DOWN: "BOARD_DOWN",
  PARSE: "PARSE",
  UNKNOWN: "UNKNOWN",
} as const;

export type LoadsErrorCode = (typeof LoadsErrorCode)[keyof typeof LoadsErrorCode];

export function publicLoadsMessage(code: LoadsErrorCode): string {
  switch (code) {
    case LoadsErrorCode.RATE_LIMIT:
      return "Too many searches. Try again shortly.";
    case LoadsErrorCode.ORIGIN:
      return "Could not find that origin. Check the city and state.";
    case LoadsErrorCode.DESTINATION:
      return "Could not find that destination. Check the city and state.";
    case LoadsErrorCode.TIMEOUT:
      return "Search took too long. Try again in a moment.";
    case LoadsErrorCode.BOARD_DOWN:
      return "The live board is temporarily unavailable. Desk posts and public boards may still show.";
    case LoadsErrorCode.UNAUTHORIZED:
      return "Live board authorization failed. Try again shortly.";
    case LoadsErrorCode.BAD_BODY:
      return "That search request was invalid. Adjust the filters and try again.";
    default:
      return "Search failed. Try again shortly.";
  }
}

export function classifyLoadsError(error: unknown): LoadsErrorCode {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (/resolve origin|city\/state|location/i.test(raw)) return LoadsErrorCode.ORIGIN;
  if (/destination/i.test(raw)) return LoadsErrorCode.DESTINATION;
  if (/timeout|timed out|AbortError/i.test(raw)) return LoadsErrorCode.TIMEOUT;
  if (/401|unauthorized|sign-in/i.test(raw)) return LoadsErrorCode.UNAUTHORIZED;
  if (/unreachable|ECONNREFUSED|ENOTFOUND|503|502|504|409/i.test(raw)) return LoadsErrorCode.BOARD_DOWN;
  return LoadsErrorCode.UNKNOWN;
}
