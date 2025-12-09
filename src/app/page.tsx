// src/app/page.tsx
import type { JSX } from "react";
import { HomeHero } from "@/app/_components/HomeHero";
import { HomeStatsPanel } from "@/app/_components/HomeStatsPanel";
import { ReportForm } from "@/app/_components/ReportForm";

export default function HomePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-base">
      {/* Hero section */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24">
        <div className="grid grid-cols-1 items-start gap-16 md:grid-cols-2">
          <HomeHero />
          <HomeStatsPanel />
        </div>
      </section>

      {/* Report form section */}
      <ReportForm />
    </div>
  );
}
