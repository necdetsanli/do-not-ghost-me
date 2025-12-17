// src/app/page.tsx
import type { JSX } from "react";
import { HomeHero } from "@/app/_components/HomeHero";
import { HomeStatsPanel } from "@/app/_components/HomeStatsPanel";
import { ReportForm } from "@/app/_components/ReportForm";

export default function HomePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-base">
      {/* Hero section */}
      <section
        className="mx-auto max-w-7xl px-6 py-14 md:px-8 md:py-24"
        aria-labelledby="home-hero-heading"
      >
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.1fr)]">
          <div>
            <HomeHero />
          </div>
          <HomeStatsPanel />
        </div>
      </section>

      {/* Report form section */}
      <ReportForm />
    </div>
  );
}
