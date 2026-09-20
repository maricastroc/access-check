export type LogLevel = "info" | "warn" | "error";

export type LogEvent =
  | "cache.read.failed"
  | "cache.write.failed"
  | "ratelimit.degraded"
  | "queue.dispatch.failed"
  | "queue.unconfigured"
  | "scan.failed"
  | "scan.history.failed";

type Fields = Record<string, unknown>;

function describe(error: unknown): Fields {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      ...(error.cause ? { errorCause: String(error.cause) } : {}),
    };
  }
  return { errorMessage: String(error) };
}

export function log(level: LogLevel, event: LogEvent, fields: Fields = {}): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function logError(event: LogEvent, error: unknown, fields: Fields = {}): void {
  log("error", event, { ...describe(error), ...fields });
}

export function logWarn(event: LogEvent, error: unknown, fields: Fields = {}): void {
  log("warn", event, { ...describe(error), ...fields });
}
