const CHALLENGE_IN_URL = /[?&]__cf_chl_/;

export function refusedByTheSite(
  status: number,
  headers: Record<string, string>,
  finalUrl: string,
): boolean {
  if (status === 403 || status === 429) return true;
  if (status < 400) return false;
  const challenged =
    headers["cf-mitigated"] === "challenge" ||
    "x-datadome" in headers ||
    CHALLENGE_IN_URL.test(finalUrl);
  return challenged;
}
