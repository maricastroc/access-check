import type { FindingView } from "@/lib/report/findings";
import { describeElement } from "@/lib/report/identity";
import type { Translate } from "@/lib/i18n/t";

export function ElementIdentityLine({ finding, t }: { finding: FindingView; t: Translate }) {
  const primary = finding.affectedSelectors[0];
  if (!primary) {
    return <code className="block font-mono text-[13px] text-steel">{finding.ruleId}</code>;
  }

  const element = describeElement(primary, finding.identities[primary], t);
  return (
    <>
      <code className="block font-mono text-[13px] break-words text-ink">{element.label}</code>
      {element.context && <p className="text-[12px] text-muted">{element.context}</p>}
    </>
  );
}
