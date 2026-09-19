const SHARED_CONCERN: Record<string, string> = {
  "target-size-crowding": "target-size",
};

export function concernOf(ruleId: string): string {
  return SHARED_CONCERN[ruleId] ?? ruleId;
}
