"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function deleteScan(id: string) {
  const userId = (await auth())?.user?.id;
  if (!userId) return;

  await prisma.scan.deleteMany({ where: { id, userId } });
  revalidatePath("/history");
}

export async function clearHistory() {
  const userId = (await auth())?.user?.id;
  if (!userId) return;

  await prisma.scan.deleteMany({ where: { userId } });
  revalidatePath("/history");
}
