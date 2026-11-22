/** Shared auth headers for the CDP loads helper (:8799). */
export function loadsHelperAuthHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = (process.env.LOADS_HELPER_TOKEN ?? "").trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["X-Loads-Helper-Token"] = token;
  }
  return headers;
}

export function loadsHelperTokenConfigured() {
  return Boolean((process.env.LOADS_HELPER_TOKEN ?? "").trim());
}
