import { redirect } from "next/navigation";
import { ReportView } from "./report-view";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  if (!url?.trim()) redirect("/");

  return <ReportView initialUrl={url} />;
}
