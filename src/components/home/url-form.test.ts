import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const field = readFileSync(fileURLToPath(new URL("./url-form.tsx", import.meta.url)), "utf8");

describe("the address field", () => {
  it("does not repeat the https:// it already shows before the input", () => {
    expect(field).toContain(">https://</span>");
    expect(field).toContain('value={value.replace(/^https:\\/\\//i, "")}');
  });
});
