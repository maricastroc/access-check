"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isReportLocale, type ReportLocale } from "@/lib/i18n/locale";
import { LOCALE_COOKIE } from "@/lib/i18n/server";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setLocale(chosen: ReportLocale) {
  if (!isReportLocale(chosen)) return;

  (await cookies()).set(LOCALE_COOKIE, chosen, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
