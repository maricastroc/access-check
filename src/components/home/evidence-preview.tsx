import { DemoQueue, DemoScreenshot } from "./demo";
import type { Translate } from "@/lib/i18n/t";

export function HeroEvidencePreview({ t }: { t: Translate }) {
  return (
    <div className="border border-hairline bg-canvas">
      <DemoScreenshot label={t("home.lens.frameLabel")} />
      <div className="border-t border-hairline">
        <DemoQueue />
      </div>
    </div>
  );
}
