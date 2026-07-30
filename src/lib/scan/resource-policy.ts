
const BLOCKED_TYPES = new Set(["media", "font"]);

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

export function shouldBlockResource(resourceType: string, url: string): boolean {
  if (BLOCKED_TYPES.has(resourceType)) return true;
  const host = hostname(url);
  if (host !== null && isTrackerHost(host)) return true;
  return false;
}
