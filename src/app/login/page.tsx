import { redirect } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub, faGoogle } from "@fortawesome/free-brands-svg-icons";
import { auth, signIn } from "@/auth";
import { Logo } from "@/components/ui";

export const runtime = "nodejs";

export default async function LoginPage() {
  if (await auth()) redirect("/");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-12">
      <main className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="mt-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Sign in to AccessCheck</h1>
          <p className="mt-2 text-sm text-muted">
            Save your audits and track each site’s score over time.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <ProviderButton provider="github" icon={faGithub} label="Continue with GitHub" />
          <ProviderButton provider="google" icon={faGoogle} label="Continue with Google" />
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-faint">
          No passwords — we only use GitHub or Google to identify you. The scanner stays free
          without an account.
        </p>

        <p className="mt-6 text-center text-sm">
          <Link href="/" className="font-medium text-ink-soft transition-colors hover:text-ink">
            ← Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}

const providerButtonClasses: Record<"github" | "google", string> = {
  github: "border border-transparent bg-ink text-white hover:bg-ink-soft",
  google:
    "border border-line-strong bg-card text-ink shadow-soft hover:border-[#d6d9df] hover:bg-canvas",
};

function ProviderButton({
  provider,
  icon,
  label,
}: {
  provider: "github" | "google";
  icon: typeof faGithub;
  label: string;
}) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn(provider, { redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className={`flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${providerButtonClasses[provider]}`}
      >
        <FontAwesomeIcon icon={icon} className="text-base" />
        {label}
      </button>
    </form>
  );
}
