import { ResultsView } from "./results-view";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  return <ResultsView initialUrl={url ?? ""} />;
}
