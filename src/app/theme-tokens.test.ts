import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const css = readFileSync(join(root, "app/globals.css"), "utf8");

const THEME_COLORS = new Set([...css.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]));
const BUILT_IN = new Set(["white", "black", "transparent", "current", "inherit"]);
const THEME_SHADOWS = new Set([...css.matchAll(/--shadow-([a-z0-9-]+):/g)].map((m) => m[1]));

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx$/.test(name) ? [path] : [];
  });
}

const COLOR_CLASS =
  /(?<![\w-])(?:[a-z-]+:|\[[^\]]+\]:)*(?:bg|text|border|ring|outline|fill|stroke|divide|from|to|decoration)-([a-z]+(?:-[a-z0-9]+)*)(?:\/\d+)?(?![\w-])/g;
const SHADOW_CLASS = /(?<![\w-])(?:[a-z-]+:)*shadow-([a-z]+(?:-[a-z]+)*)(?![\w-])/g;
const NOT_COLORS =
  /^(?:[xytblrse](?:-\d+)?|0|2|4|8|none|solid|dashed|dotted|double|collapse|separate|left|right|center|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip|base|xs|sm|md|lg|xl|[2-9]xl|auto|inset|offset-\d+|fixed|local|scroll|cover|contain|no-repeat|repeat|top|bottom|clip-text|clip-padding|underline|line-through|opacity-\d+)$/;
const SIZE = /^(?:xs|sm|md|lg|xl|[2-9]xl|none|inner)$/;

describe("every color and shadow class names a token the theme defines", () => {
  it.each(sources(root).map((path) => [path.slice(root.length), path]))("%s", (_, path) => {
    const source = readFileSync(path, "utf8");
    const unknown = [
      ...[...source.matchAll(COLOR_CLASS)]
        .map((m) => m[1])
        .filter((name) => !NOT_COLORS.test(name))
        .filter((name) => !THEME_COLORS.has(name) && !BUILT_IN.has(name)),
      ...[...source.matchAll(SHADOW_CLASS)]
        .map((m) => m[1])
        .filter((name) => !SIZE.test(name) && !THEME_SHADOWS.has(name)),
    ];
    expect([...new Set(unknown)]).toEqual([]);
  });
});
