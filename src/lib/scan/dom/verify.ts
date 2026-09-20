import type { FixApply } from "../remediate";
import type { FixVerification } from "../types";

export type VerifyOp = { ruleId: string; selector: string | null; apply: FixApply };

async function clearsRule(context: Element | Document, ruleId: string): Promise<boolean> {
  const res = await window.axe.run(context, { runOnly: { type: "rule", values: [ruleId] } });
  return res.violations.length === 0;
}

async function verifyOne(op: VerifyOp): Promise<FixVerification> {
  const a = op.apply;

  if (a.kind === "doc" && a.target === "lang") {
    const el = document.documentElement;
    const prev = el.getAttribute("lang");
    el.setAttribute("lang", a.value);
    const ok = await clearsRule(document, op.ruleId);
    if (prev === null) el.removeAttribute("lang");
    else el.setAttribute("lang", prev);
    return ok ? "verified" : "failed";
  }

  if (a.kind === "doc" && a.target === "title") {
    const prev = document.title;
    document.title = a.value;
    const ok = await clearsRule(document, op.ruleId);
    document.title = prev;
    return ok ? "verified" : "failed";
  }

  if (a.kind === "viewport") {
    let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    const created = !meta;
    const prev = meta?.getAttribute("content") ?? null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "viewport");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", a.value);
    const ok = await clearsRule(document, op.ruleId);
    if (created) meta.remove();
    else if (prev !== null) meta.setAttribute("content", prev);
    return ok ? "verified" : "failed";
  }

  if (!op.selector) return "unchecked";
  const el = document.querySelector(op.selector);
  if (!el) return "unchecked";

  if (a.kind === "attr") {
    const prev = el.getAttribute(a.name);
    el.setAttribute(a.name, a.value);
    const ok = await clearsRule(el, op.ruleId);
    if (prev === null) el.removeAttribute(a.name);
    else el.setAttribute(a.name, prev);
    return ok ? "verified" : "failed";
  }

  if (a.kind === "style") {
    const style = (el as HTMLElement).style;
    const hadAttribute = el.hasAttribute("style");
    const previousAttribute = el.getAttribute("style");
    style.setProperty(a.prop, a.value, "important");

    const ok = await clearsRule(el, op.ruleId);

    if (!hadAttribute) el.removeAttribute("style");
    else el.setAttribute("style", previousAttribute ?? "");
    return ok ? "verified" : "failed";
  }

  return "unchecked";
}

export async function verifyFixes(ops: VerifyOp[]): Promise<FixVerification[]> {
  const results: FixVerification[] = [];
  for (const op of ops) {
    try {
      results.push(await verifyOne(op));
    } catch {
      results.push("unchecked");
    }
  }
  return results;
}
