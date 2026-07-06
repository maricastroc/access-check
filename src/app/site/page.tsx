import { SiteStarter } from "./site-starter";

export default async function SitePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  return <SiteStarter initialUrl={url ?? ""} />;
}
