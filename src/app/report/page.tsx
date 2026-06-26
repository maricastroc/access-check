import { ReportView } from "./report-view";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  return <ReportView initialUrl={url ?? ""} />;
}
