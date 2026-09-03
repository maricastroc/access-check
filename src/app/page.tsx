import { SiteHeader } from "@/components/home/site-header";
import { Hero } from "@/components/home/hero";
import {
  ChecksIncluded,
  EvidenceLensSection,
  ExportSection,
  FinalCta,
  HowItWorks,
  SandboxSection,
} from "@/components/home/landing-sections";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <SiteHeader />
      <main id="main" className="flex-1">
        <Hero />
        <HowItWorks />
        <ChecksIncluded />
        <EvidenceLensSection />
        <SandboxSection />
        <ExportSection />
        <FinalCta />
      </main>
    </div>
  );
}
