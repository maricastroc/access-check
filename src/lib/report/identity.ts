import type { ElementIdentity } from "@/lib/scan/dom/identity";
import type { Translate } from "@/lib/i18n/t";

export type IdentityView = {
  label: string;
  context: string | null;
  locator: string;
};

export function identityLabel(identity: ElementIdentity, t: Translate): string {
  const parts = [`${identity.tag}${identity.ref ?? ""}`];
  if (identity.name) parts.push(`“${identity.name}”`);
  if (identity.of !== null && identity.of > 1 && identity.nth !== null) {
    parts.push(t("identity.nth", { n: identity.nth, total: identity.of }));
  }
  return parts.join(" ");
}

export function identityContext(identity: ElementIdentity, t: Translate): string | null {
  if (!identity.region) return null;
  const where = identity.regionName
    ? `${identity.region} “${identity.regionName}”`
    : identity.region;
  return t("identity.in", { where });
}

export function describeElement(
  locator: string,
  identity: ElementIdentity | undefined,
  t: Translate,
): IdentityView {
  if (!identity) return { label: locator, context: null, locator };
  return { label: identityLabel(identity, t), context: identityContext(identity, t), locator };
}

export function elementLine(
  locator: string,
  identity: ElementIdentity | undefined,
  t: Translate,
): string {
  const view = describeElement(locator, identity, t);
  return view.context ? `${view.label} · ${view.context}` : view.label;
}
