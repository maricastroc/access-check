"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui";

export function UrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");

  function analyze(target?: string) {
    const value = (target ?? url).trim();
    // numa app real passaríamos a URL adiante; aqui só navegamos ao relatório
    router.push(value ? `/results?url=${encodeURIComponent(value)}` : "/results");
  }

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          analyze();
        }}
        className="mt-9 flex max-w-xl items-center gap-2 rounded-field border border-line bg-card p-2 shadow-card"
      >
        <div className="flex flex-1 items-center gap-3 px-3">
          <FontAwesomeIcon icon={faGlobe} className="shrink-0 text-base text-muted" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://yourwebsite.com"
            aria-label="Website URL"
            className="w-full bg-transparent py-2.5 text-base text-ink placeholder:text-muted/70 focus:outline-none"
          />
        </div>
        <Button type="submit" className="shrink-0">
          Analyze accessibility
        </Button>
      </form>

      <div className="mt-5 flex items-center gap-3 text-sm">
        <span className="text-muted">Try an example:</span>
        <button
          type="button"
          onClick={() => analyze("vercel.com")}
          className="rounded-md bg-brand-50 px-2 py-1 font-mono text-brand-700 transition-colors hover:bg-brand-100"
        >
          vercel.com
        </button>
      </div>
    </>
  );
}
