/**
 * Single source of truth for "are we running in a deployed environment?".
 *
 * Security-sensitive fallbacks (signature verification, rate limiting) must fail
 * *closed* here and stay permissive only in local development, so a missing env
 * var can never silently disable a protection in production.
 *
 * NODE_ENV is "production" for every deployed build (including Vercel preview
 * deployments), and "development"/"test" locally — which is exactly the line we
 * want to draw.
 */
export function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}
