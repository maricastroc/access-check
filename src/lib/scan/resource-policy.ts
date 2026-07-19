/**
 * Decides which subresources Chromium is allowed to fetch during a scan.
 *
 * The goal is speed without changing the audit: axe evaluates the DOM and
 * computed styles, so fonts, audio/video and third-party tracking/analytics
 * beacons never affect a WCAG result — but they cost bandwidth, CPU and, worse,
 * keep network connections alive (which is why `networkidle` never fires on
 * ad-heavy pages). We keep everything the audit depends on: documents, HTML,
 * CSS, images (needed for the screenshot and image-alt context), scripts and
 * XHR/fetch (SPAs render through them).
 *
 * This is pure and network-free so it can be unit-tested; the browser guard
 * calls it after the SSRF check, which always stays authoritative.
 */

/** Playwright resource types that never influence a WCAG audit. */
const BLOCKED_TYPES = new Set(["media", "font"]);

/**
 * Hosts that only serve analytics, ads or session-replay. Matched as a
 * substring of the request hostname. Kept conservative on purpose — blocking a
 * real first-party asset would change the audit, so this list only holds
 * well-known third-party trackers.
 */
const TRACKER_HOSTS = [
  "google-analytics.com",
  "googletagmanager.com",
  "doubleclick.net",
  "googlesyndication.com",
  "google-adservices.com",
  "adservice.google.com",
  "scorecardresearch.com",
  "hotjar.com",
  "hotjar.io",
  "segment.com",
  "segment.io",
  "amplitude.com",
  "mixpanel.com",
  "fullstory.com",
  "facebook.net",
  "connect.facebook.net",
  "criteo.com",
  "criteo.net",
  "taboola.com",
  "outbrain.com",
  "adnxs.com",
  "quantserve.com",
  "chartbeat.com",
  "nr-data.net",
  "newrelic.com",
  "optimizely.com",
  "bat.bing.com",
  "snap.licdn.com",
  "px.ads.linkedin.com",
  "sb.scorecardresearch.com",
  "cdn.branch.io",
  "clarity.ms",
  "yandex.ru",
];

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isTrackerHost(host: string): boolean {
  return TRACKER_HOSTS.some((t) => host === t || host.endsWith(`.${t}`) || host.includes(t));
}

/**
 * True when the request can be aborted without affecting the audit.
 * `resourceType` is Playwright's request resource type (e.g. "font", "media",
 * "image", "script", "document", "stylesheet", "xhr", "fetch").
 */
export function shouldBlockResource(resourceType: string, url: string): boolean {
  if (BLOCKED_TYPES.has(resourceType)) return true;
  const host = hostname(url);
  if (host !== null && isTrackerHost(host)) return true;
  return false;
}
