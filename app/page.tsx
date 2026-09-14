import { Dashboard } from "@/components/dashboard";

export default function Home() {
  return (
    <div className="min-h-full">
      <div className="border-b border-amber-500/50 bg-amber-500 text-zinc-950">
        <p className="mx-auto max-w-6xl px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.18em] sm:text-sm">
          Paper only — simulated money — no real exchange orders
        </p>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Dashboard />
      </main>
    </div>
  );
}
