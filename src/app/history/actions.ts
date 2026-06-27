"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Apaga um scan do histórico do usuário (cascade remove o screenshot). */
export async function deleteScan(id: string) {
  const userId = (await auth())?.user?.id;
  if (!userId) return;

  // deleteMany escopado ao dono: garante que ninguém apaga scan de outro.
  await prisma.scan.deleteMany({ where: { id, userId } });
  revalidatePath("/history");
}

/** Limpa todo o histórico do usuário. */
export async function clearHistory() {
  const userId = (await auth())?.user?.id;
  if (!userId) return;

  await prisma.scan.deleteMany({ where: { userId } });
  revalidatePath("/history");
}
