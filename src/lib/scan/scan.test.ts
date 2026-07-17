import { createServer, type Server } from "http";
import type { AddressInfo } from "net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runScan } from "./scan";

// Teste de integração da camada mais arriscada: sobe Chromium de verdade (o
// executor local do Playwright, sem mock) contra fixtures servidos por HTTP,
// exercitando o pipeline inteiro — navegação, checagem de status, injeção do
// axe, screenshot e o round-trip de verificação de fixes. Os outros arquivos
// testam funções puras; este prova que o browser realmente roda.

const PAGES: Record<string, { status?: number; html: string }> = {
  // <html> sem lang, sem <title>, <img> sem alt e texto de baixo contraste —
  // quatro violações de axe estáveis e deterministas.
  "/broken": {
    html: `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <main>
      <h1>Fixture</h1>
      <img src="/logo.png" />
      <p style="color:#bbbbbb;background:#ffffff;margin:0;font-size:16px">
        texto de baixo contraste
      </p>
    </main>
  </body>
</html>`,
  },
  // Página bem-formada: lang, title, viewport, alt e contraste alto.
  "/clean": {
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Clean fixture</title>
  </head>
  <body>
    <main>
      <h1>Accessible page</h1>
      <p style="color:#111827;background:#ffffff">High contrast copy that reads well.</p>
      <img src="/logo.png" alt="Company logo" />
    </main>
  </body>
</html>`,
  },
  "/gone": {
    status: 404,
    html: `<!doctype html><html lang="en"><head><title>Gone</title></head><body>not found</body></html>`,
  },
};

let server: Server;
let base: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const page = PAGES[req.url ?? ""];
    if (!page) {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
    res.statusCode = page.status ?? 200;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(page.html);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

describe("runScan (integração — browser real)", () => {
  it(
    "detecta violações conhecidas e comprova fixes re-rodando o axe no DOM",
    async () => {
      const result = await runScan(`${base}/broken`, {
        screenshot: true,
        keyboard: false,
        contexts: false,
        verifyFixes: true,
      });

      const ids = result.violations.map((v) => v.id);
      expect(ids).toContain("image-alt");
      expect(ids).toContain("html-has-lang");

      // Score real, dentro do intervalo, abaixo de 100 porque há violações.
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThan(100);
      expect(result.counts.critical).toBeGreaterThanOrEqual(1); // image-alt

      // Screenshot capturado como data URL JPEG.
      expect(result.screenshot).toMatch(/^data:image\/jpeg;base64,/);

      // O núcleo do produto: aplicar o fix no DOM, re-rodar o axe escopado e
      // confirmar que a regra parou de falhar. Ao menos um precisa comprovar.
      const verified = result.violations.filter((v) => v.verification === "verified");
      expect(verified.length).toBeGreaterThan(0);
    },
    60_000,
  );

  it(
    "aborta com mensagem de HTTP quando a página responde 4xx",
    async () => {
      await expect(runScan(`${base}/gone`)).rejects.toThrow(/HTTP 404/);
    },
    60_000,
  );

  it(
    "página acessível não gera violação de WCAG e pontua alto",
    async () => {
      const result = await runScan(`${base}/clean`, {
        screenshot: false,
        keyboard: false,
        contexts: false,
        verifyFixes: false,
      });
      expect(result.counts.critical).toBe(0);
      expect(result.score).toBeGreaterThan(90);
    },
    60_000,
  );
});
