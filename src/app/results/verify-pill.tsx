import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import type { FixVerification } from "@/lib/scan/types";

export function VerifyPill({ v }: { v: FixVerification }) {
  if (v === "verified")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[#e7f6ee] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#1a7f46]">
        <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
        Verified — re-scan passes
      </span>
    );
  if (v === "failed")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[#fdf0e7] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#b8651b]">
        <FontAwesomeIcon icon={faTriangleExclamation} className="text-[9px]" />
        Needs review — re-scan still flags
      </span>
    );
  return null;
}
