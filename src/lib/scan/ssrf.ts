import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { BrowserContext } from "playwright-core";
import { shouldBlockResource } from "./resource-policy";

/**
 * Anti-SSRF guard. Every URL the user submits to be scanned passes through
 * here before it becomes a network request: the target is a public
 * "scan any URL" tool, so without this a single POST could point the
 * Chromium (or the discovery fetch) at `localhost`, private ranges, or the
 * cloud metadata endpoint (169.254.169.254).
 */
export class BlockedUrlError extends Error {
  constructor(
    message = "This URL points to a private or reserved address and can't be scanned.",
  ) {
    super(message);
    this.name = "BlockedUrlError";
  }
}

function ipv4ToLong(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const b = Number(p);
    if (b > 255) return null;
    n = n * 256 + b;
  }
  return n >>> 0;
}

function inV4Range(long: number, cidr: string): boolean {
  const [base, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  const baseLong = ipv4ToLong(base);
  if (baseLong === null) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (long & mask) === (baseLong & mask);
}

const V4_BLOCKED = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4",
  "240.0.0.0/4",
];

function isBlockedIpv4(ip: string): boolean {
  const long = ipv4ToLong(ip);
  if (long === null) return true;
  return V4_BLOCKED.some((c) => inV4Range(long, c));
}

function ipv6ToBytes(input: string): number[] | null {
  let ip = input.split("%")[0];

  const lastColon = ip.lastIndexOf(":");
  const tail = ip.slice(lastColon + 1);
  if (tail.includes(".")) {
    const long = ipv4ToLong(tail);
    if (long === null) return null;
    const hi = ((long >>> 16) & 0xffff).toString(16);
    const lo = (long & 0xffff).toString(16);
    ip = `${ip.slice(0, lastColon + 1)}${hi}:${lo}`;
  }

  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const parse = (s: string) => (s ? s.split(":").map((g) => parseInt(g, 16)) : []);
  const head = parse(halves[0]);
  const rest = halves.length === 2 ? parse(halves[1]) : [];

  let groups: number[];
  if (halves.length === 2) {
    const missing = 8 - head.length - rest.length;
    if (missing < 0) return null;
    groups = [...head, ...Array(missing).fill(0), ...rest];
  } else {
    groups = head;
  }
  if (groups.length !== 8 || groups.some((g) => Number.isNaN(g) || g < 0 || g > 0xffff)) {
    return null;
  }

  const bytes: number[] = [];
  for (const g of groups) bytes.push((g >> 8) & 0xff, g & 0xff);
  return bytes;
}

function isBlockedIpv6(ip: string): boolean {
  const b = ipv6ToBytes(ip);
  if (!b) return true;

  if (b.every((x) => x === 0)) return true;
  if (b.slice(0, 15).every((x) => x === 0) && b[15] === 1) return true;

  const isMapped = b.slice(0, 10).every((x) => x === 0) && b[10] === 0xff && b[11] === 0xff;
  const isNat64 =
    b[0] === 0x00 &&
    b[1] === 0x64 &&
    b[2] === 0xff &&
    b[3] === 0x9b &&
    b.slice(4, 12).every((x) => x === 0);
  if (isMapped || isNat64) return isBlockedIpv4(`${b[12]}.${b[13]}.${b[14]}.${b[15]}`);

  if ((b[0] & 0xfe) === 0xfc) return true;
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true;
  if (b[0] === 0xff) return true;
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) return true;

  return false;
}

export function isBlockedIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isBlockedIpv4(ip);
  if (kind === 6) return isBlockedIpv6(ip);
  return true;
}

function stripBrackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

/**
 * Throws `BlockedUrlError` if the URL isn't a public http(s) one. Resolves the
 * hostname and blocks if *any* returned address falls in a reserved range —
 * this covers a domain with several A records where only one is internal.
 */
export async function assertPublicUrl(raw: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedUrlError("Invalid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedUrlError("Only http and https URLs can be scanned.");
  }

  const host = stripBrackets(url.hostname).toLowerCase();
  if (host === "" || host === "localhost" || host.endsWith(".localhost")) {
    throw new BlockedUrlError();
  }

  if (isIP(host)) {
    if (isBlockedIp(host)) throw new BlockedUrlError();
    return;
  }

  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw new BlockedUrlError("This host could not be resolved.");
  }
  if (addrs.length === 0 || addrs.some((a) => isBlockedIp(a.address))) {
    throw new BlockedUrlError();
  }
}

/**
 * Defense in depth for the browser path: intercepts Chromium's requests and
 * aborts the ones pointing at a reserved address. Catches the vector the
 * initial URL-only check misses — a public host that 302s to
 * `http://169.254.169.254/`. Navigations go through full DNS resolution;
 * subresources get only the cheap literal-IP check.
 */
export async function installNetworkGuard(context: BrowserContext): Promise<void> {
  await context.route("**/*", async (route) => {
    const req = route.request();
    try {
      const url = new URL(req.url());
      if (url.protocol === "http:" || url.protocol === "https:") {
        if (req.isNavigationRequest()) {
          await assertPublicUrl(url.toString());
        } else {
          const host = stripBrackets(url.hostname);
          if (isIP(host) && isBlockedIp(host)) throw new BlockedUrlError();
          // SSRF-safe: drop resources that never affect the audit (fonts,
          // media, trackers) so the page settles faster. Navigations are never
          // dropped here — resource policy only blocks subresource types.
          if (shouldBlockResource(req.resourceType(), url.toString())) {
            await route.abort("blockedbyclient");
            return;
          }
        }
      }
      await route.continue();
    } catch {
      await route.abort("blockedbyclient");
    }
  });
}
