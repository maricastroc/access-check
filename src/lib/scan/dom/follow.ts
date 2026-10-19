import type { StopRef } from "./focus";
import { post } from "./overlay";

export const FOLLOW_FOCUS = "follow:focus";

let stops: StopRef[] = [];
let found = new Map<number, Element>();
let listener: ((e: FocusEvent) => void) | null = null;

function query(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function elementOf(stop: StopRef): Element | null {
  const known = found.get(stop.n);
  if (known?.isConnected) return known;
  const el = query(stop.selector);
  if (el) found.set(stop.n, el);
  else found.delete(stop.n);
  return el;
}

function stopsAt(el: Element): number[] {
  return stops.filter((stop) => elementOf(stop) === el).map((stop) => stop.n);
}

export function followStart(list: StopRef[]): void {
  followStop();
  stops = list;
  listener = (e) => {
    const el = e.target;
    if (!(el instanceof Element) || el.closest("[data-accesscheck]")) return;
    if (el === document.body || el === document.documentElement) return;
    post({ type: FOLLOW_FOCUS, stops: stopsAt(el) });
  };
  document.addEventListener("focusin", listener, true);
}

export function followStop(): void {
  if (listener) document.removeEventListener("focusin", listener, true);
  listener = null;
  stops = [];
  found = new Map();
}
