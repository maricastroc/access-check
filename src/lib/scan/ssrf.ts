import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { BrowserContext } from "playwright-core";

/**
 * Guarda anti-SSRF. Qualquer URL que o usuário manda pra ser escaneada passa
 * por aqui antes de virar uma requisição de rede: o alvo é uma ferramenta
 * pública "escaneie qualquer URL", então sem isso um único POST aponta o
 * Chromium (ou o fetch de descoberta) pra `localhost`, faixas privadas ou o
 * endpoint de metadata da cloud (169.254.169.254).
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

// Faixas IPv4 que nunca devem ser alcançadas por uma requisição externa.
const V4_BLOCKED = [
  "0.0.0.0/8", // "this host"
  "10.0.0.0/8", // privada
  "100.64.0.0/10", // CGNAT
  "127.0.0.0/8", // loopback
  "169.254.0.0/16", // link-local (inclui a metadata da cloud)
  "172.16.0.0/12", // privada
  "192.0.0.0/24", // IETF protocol assignments
  "192.0.2.0/24", // TEST-NET-1
  "192.168.0.0/16", // privada
  "198.18.0.0/15", // benchmarking
  "198.51.100.0/24", // TEST-NET-2
  "203.0.113.0/24", // TEST-NET-3
  "224.0.0.0/4", // multicast
  "240.0.0.0/4", // reservada (inclui 255.255.255.255)
];

function isBlockedIpv4(ip: string): boolean {
  const long = ipv4ToLong(ip);
  if (long === null) return true; // não parseou → bloqueia por segurança
  return V4_BLOCKED.some((c) => inV4Range(long, c));
}

/** Expande um endereço IPv6 (com `::` e cauda IPv4 embutida) em 16 bytes. */
function ipv6ToBytes(input: string): number[] | null {
  let ip = input.split("%")[0]; // descarta zone id (fe80::1%eth0)

  // Cauda IPv4 embutida (::ffff:1.2.3.4) → converte pra dois grupos hex.
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

  if (b.every((x) => x === 0)) return true; // :: (unspecified)
  if (b.slice(0, 15).every((x) => x === 0) && b[15] === 1) return true; // ::1 (loopback)

  // IPv4-mapped (::ffff:0:0/96) e NAT64 (64:ff9b::/96): checa o IPv4 embutido.
  const isMapped = b.slice(0, 10).every((x) => x === 0) && b[10] === 0xff && b[11] === 0xff;
  const isNat64 =
    b[0] === 0x00 &&
    b[1] === 0x64 &&
    b[2] === 0xff &&
    b[3] === 0x9b &&
    b.slice(4, 12).every((x) => x === 0);
  if (isMapped || isNat64) return isBlockedIpv4(`${b[12]}.${b[13]}.${b[14]}.${b[15]}`);

  if ((b[0] & 0xfe) === 0xfc) return true; // fc00::/7 (unique local)
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true; // fe80::/10 (link-local)
  if (b[0] === 0xff) return true; // ff00::/8 (multicast)
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) return true; // 2001:db8::/32

  return false;
}

/** Verdadeiro se `ip` é loopback, privado, link-local ou reservado. */
export function isBlockedIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isBlockedIpv4(ip);
  if (kind === 6) return isBlockedIpv6(ip);
  return true; // não é um IP válido → não confia
}

function stripBrackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

/**
 * Lança `BlockedUrlError` se a URL não for http(s) pública. Resolve o hostname
 * e bloqueia se *qualquer* endereço retornado cair numa faixa reservada — isso
 * cobre o caso de um domínio com vários registros A onde só um é interno.
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
 * Defesa em profundidade pro caminho do browser: intercepta as requisições do
 * Chromium e aborta as que apontam pra endereço reservado. Pega o vetor que a
 * checagem só da URL inicial não pega — um host público que faz 302 pra
 * `http://169.254.169.254/`. Navegações passam pela resolução DNS completa;
 * subrecursos levam só a checagem barata de IP literal.
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
        }
      }
      await route.continue();
    } catch {
      await route.abort("blockedbyclient");
    }
  });
}
