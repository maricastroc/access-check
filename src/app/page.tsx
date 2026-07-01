import { SiteHeader } from "@/components/home/site-header";
import { Hero } from "@/components/home/hero";
import { Features } from "@/components/home/features";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <Hero />
        <Features />
      </main>
    </div>
  );
}
