import type { KeyboardReport } from "@/lib/scan/keyboard";
import type { Translate } from "@/lib/i18n/t";

export function focusPathLines(
  keyboard: KeyboardReport,
  t: Translate,
): { line: string; notes: string[] } {
  const stops = keyboard.focusPath.length;
  const total = keyboard.totalInteractive;
  const rest = Math.max(0, total - stops);
  const notes: string[] = [];

  if (total === 0 && stops === 0) {
    return { line: t("focusPath.none"), notes };
  }

  const stopsText = t("unit.stop", { count: stops });
  const controlsText = t("unit.detectedControl", { count: total });

  const line =
    keyboard.stoppedBy === "cycle"
      ? t("focusPath.full", { stops: stopsText, controls: controlsText })
      : t("focusPath.firstOnly", { count: stops, stops, controls: controlsText });

  if (!keyboard.startedAtTop) {
    notes.push(t("focusPath.notFromTop", { stops: stopsText }));
  }

  const leftover =
    rest > 0 ? t("focusPath.leftoverSome", { count: rest }) : t("focusPath.leftoverNone");

  if (keyboard.stoppedBy === "cap") {
    notes.push(t("focusPath.stoppedByCap", { stops, leftover }));
  } else if (keyboard.stoppedBy === "timeout") {
    notes.push(t("focusPath.stoppedByTimeout", { stops: stopsText, leftover }));
  } else if (keyboard.stoppedBy === "opaque") {
    notes.push(t("focusPath.stoppedByOpaque", { leftover }));
  } else if (keyboard.stoppedBy === "trap") {
    notes.push(t("focusPath.stoppedByTrap", { stops, leftover }));
  }

  return { line, notes };
}
