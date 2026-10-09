"use client";

import { SCAN_VIEWPORT, type ScanResult } from "@/lib/scan/types";
import type { FindingView } from "@/lib/report/findings";
import type { Occurrence } from "@/lib/report/occurrences";
import { chainOf } from "@/lib/report/chain";
import { Crop, GhostRing, Locus } from "@/components/investigation";
import type { Translate } from "@/lib/i18n/t";
import { captureById, occurrencePlaces } from "./report-ui";

export function evidenceFigure(
  f: FindingView,
  occ: Occurrence | null,
  result: ScanResult,
  t: Translate,
) {
  if (!occ) return null;
  const evidence = chainOf(f, occ).evidence.kind;
  if (evidence !== "unnamed" && evidence !== "focus") return null;
  const place = occurrencePlaces(occ, result.keyboard?.focusPath ?? [], result.regions ?? [])[0];
  if (!place) return null;
  const image = captureById(place.captureId, result.screenshot, result.regions ?? []).image;
  if (!image) return null;
  const label = t("chain.closeUp", { label: occ.identity?.name ?? occ.selector });

  if (evidence === "focus") {
    return (
      <div className="mb-1 flex flex-wrap items-end gap-3">
        <figure>
          <figcaption className="mb-1 text-[13.5px] text-muted">{t("chain.atRest")}</figcaption>
          <Crop
            src={image}
            page={SCAN_VIEWPORT}
            box={place.box}
            maxW={150}
            maxH={72}
            pad={18}
            label={label}
          />
        </figure>
        <span aria-hidden className="pb-6 font-mono text-[18px] text-muted">
          =
        </span>
        <figure>
          <figcaption className="mb-1 text-[13.5px] text-muted">{t("chain.withFocus")}</figcaption>
          <Crop
            src={image}
            page={SCAN_VIEWPORT}
            box={place.box}
            maxW={150}
            maxH={72}
            pad={18}
            label={t("chain.ringShould")}
          >
            {(inner) => <GhostRing box={inner} gap={5} />}
          </Crop>
        </figure>
        <p className="basis-full text-[13.5px] text-ink-2">
          <span className="font-semibold text-ink">{t("chain.noDifference")}.</span>{" "}
          {t("chain.ringShould")}:{" "}
          <span
            aria-hidden
            data-sev="serious"
            className="ac-hatch inline-block h-2.5 w-6 border border-(--sev-ink) align-middle"
          />
        </p>
      </div>
    );
  }

  return (
    <Crop
      src={image}
      page={SCAN_VIEWPORT}
      box={place.box}
      maxW={f.ruleId === "image-alt" ? 170 : 130}
      maxH={84}
      pad={f.ruleId === "image-alt" ? 12 : 22}
      label={label}
    >
      {(inner) => <Locus box={inner} weight="current" />}
    </Crop>
  );
}
