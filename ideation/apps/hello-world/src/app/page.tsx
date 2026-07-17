import { GreetingCard } from "@/components/hello/greeting-card";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getBuildInfo } from "@/infrastructure/build-info";

export default function Home() {
  const buildInfo = getBuildInfo();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-sm font-medium text-muted-foreground">
          ideation / hello-world
        </span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <GreetingCard buildInfo={buildInfo} />
      </main>
      <footer className="px-6 py-4 text-center text-xs text-muted-foreground">
        Built with Next.js + shadcn/ui · four-layer architecture
      </footer>
    </div>
  );
}
