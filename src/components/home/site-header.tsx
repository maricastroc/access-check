import { Button, Logo } from "@/components/ui";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
      <Logo />

      <div className="flex items-center gap-3">
        <a
          href="#"
          className="hidden text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:block"
        >
          Sign in
        </a>
        <Button href="#" variant="dark" className="px-4 py-2.5 font-medium">
          Start free
        </Button>
      </div>
    </header>
  );
}
