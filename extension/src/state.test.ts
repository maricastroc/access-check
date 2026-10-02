import { describe, expect, it } from "vitest";
import { sameDocument } from "./state";

describe("the overlay only draws on the page that was audited", () => {
  it("treats a change of fragment as the same page", () => {
    expect(sameDocument("https://shop.example/a?x=1#top", "https://shop.example/a?x=1")).toBe(true);
  });

  it("sees another path or query on the same site as another page", () => {
    expect(sameDocument("https://shop.example/b", "https://shop.example/a")).toBe(false);
    expect(sameDocument("https://shop.example/a?x=2", "https://shop.example/a?x=1")).toBe(false);
  });

  it("compares the text itself when either side is not a URL", () => {
    expect(sameDocument("about:blank", "about:blank")).toBe(true);
    expect(sameDocument("not a url", "https://shop.example/")).toBe(false);
  });
});
