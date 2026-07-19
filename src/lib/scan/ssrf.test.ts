import { describe, expect, it } from "vitest";
import { assertPublicUrl, BlockedUrlError, isBlockedIp } from "./ssrf";

describe("isBlockedIp", () => {
  it("blocks loopback, private, link-local and cloud metadata (IPv4)", () => {
    for (const ip of [
      "127.0.0.1",
      "127.5.4.3",
      "10.0.0.1",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "255.255.255.255",
      "224.0.0.1",
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("allows public IPv4", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.32.0.1", "192.167.0.1"]) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });

  it("blocks loopback, ULA, link-local and embedded IPv4 (IPv6)", () => {
    for (const ip of [
      "::1",
      "::",
      "fc00::1",
      "fd12:3456::1",
      "fe80::1",
      "ff02::1",
      "::ffff:127.0.0.1",
      "::ffff:169.254.169.254",
      "2001:db8::1",
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("allows public IPv6", () => {
    for (const ip of ["2606:4700:4700::1111", "2001:4860:4860::8888"]) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });

  it("blocks entries that are not a valid IP", () => {
    expect(isBlockedIp("not-an-ip")).toBe(true);
    expect(isBlockedIp("999.1.1.1")).toBe(true);
  });
});

describe("assertPublicUrl", () => {
  const rejects = (url: string) => expect(assertPublicUrl(url)).rejects.toBeInstanceOf(BlockedUrlError);

  it("rejects localhost and private ranges by literal IP", async () => {
    await rejects("http://localhost/");
    await rejects("http://admin.localhost/");
    await rejects("http://127.0.0.1/");
    await rejects("http://169.254.169.254/latest/meta-data/");
    await rejects("http://[::1]/");
    await rejects("http://192.168.0.1:8080/internal");
  });

  it("rejects schemes that are not http(s)", async () => {
    await rejects("file:///etc/passwd");
    await rejects("ftp://10.0.0.1/");
    await rejects("gopher://127.0.0.1/");
  });

  it("rejects an invalid URL", async () => {
    await rejects("http://");
    await rejects("not a url");
  });

  it("accepts a public literal IP without resolving DNS", async () => {
    await expect(assertPublicUrl("http://8.8.8.8/")).resolves.toBeUndefined();
  });
});
