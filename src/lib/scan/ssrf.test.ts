import { describe, expect, it } from "vitest";
import { assertPublicUrl, BlockedUrlError, isBlockedIp } from "./ssrf";

describe("isBlockedIp", () => {
  it("bloqueia loopback, privadas, link-local e metadata da cloud (IPv4)", () => {
    for (const ip of [
      "127.0.0.1",
      "127.5.4.3",
      "10.0.0.1",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254", // metadata da cloud
      "100.64.0.1", // CGNAT
      "0.0.0.0",
      "255.255.255.255",
      "224.0.0.1", // multicast
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("libera IPv4 público", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.32.0.1", "192.167.0.1"]) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });

  it("bloqueia loopback, ULA, link-local e IPv4 embutido (IPv6)", () => {
    for (const ip of [
      "::1",
      "::",
      "fc00::1",
      "fd12:3456::1",
      "fe80::1",
      "ff02::1",
      "::ffff:127.0.0.1", // IPv4-mapped loopback
      "::ffff:169.254.169.254", // IPv4-mapped metadata
      "2001:db8::1", // documentação
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("libera IPv6 público", () => {
    for (const ip of ["2606:4700:4700::1111", "2001:4860:4860::8888"]) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });

  it("bloqueia entradas que não são IP válido", () => {
    expect(isBlockedIp("not-an-ip")).toBe(true);
    expect(isBlockedIp("999.1.1.1")).toBe(true);
  });
});

describe("assertPublicUrl", () => {
  const rejects = (url: string) => expect(assertPublicUrl(url)).rejects.toBeInstanceOf(BlockedUrlError);

  it("rejeita localhost e faixas privadas por IP literal", async () => {
    await rejects("http://localhost/");
    await rejects("http://admin.localhost/");
    await rejects("http://127.0.0.1/");
    await rejects("http://169.254.169.254/latest/meta-data/");
    await rejects("http://[::1]/");
    await rejects("http://192.168.0.1:8080/internal");
  });

  it("rejeita esquemas que não são http(s)", async () => {
    await rejects("file:///etc/passwd");
    await rejects("ftp://10.0.0.1/");
    await rejects("gopher://127.0.0.1/");
  });

  it("rejeita URL inválida", async () => {
    await rejects("http://");
    await rejects("not a url");
  });

  it("aceita IP público literal sem resolver DNS", async () => {
    await expect(assertPublicUrl("http://8.8.8.8/")).resolves.toBeUndefined();
  });
});
