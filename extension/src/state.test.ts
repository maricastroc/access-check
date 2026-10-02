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

  it("sees another route of an app that routes by the fragment as another page", () => {
    expect(sameDocument("https://app.example/#/settings", "https://app.example/#/home")).toBe(
      false,
    );
    expect(sameDocument("https://app.example/#!/b", "https://app.example/#!/a")).toBe(false);
    expect(sameDocument("https://app.example/#/home", "https://app.example/")).toBe(false);
    expect(sameDocument("https://app.example/#/home", "https://app.example/#/home")).toBe(true);
  });

  it("compares the text itself when either side is not a URL", () => {
    expect(sameDocument("about:blank", "about:blank")).toBe(true);
    expect(sameDocument("not a url", "https://shop.example/")).toBe(false);
  });
});
