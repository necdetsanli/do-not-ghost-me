// src/app/about/page.tsx
import type { JSX } from "react";
import type { Metadata } from "next";

import { AboutIntroSection } from "@/app/about/_components/AboutIntroSection";
import { AboutProblemAndHelpSection } from "@/app/about/_components/AboutProblemAndHelpSection";
import { AboutPrivacySection } from "@/app/about/_components/AboutPrivacySection";
import { AboutContributeSection } from "@/app/about/_components/AboutContributeSection";
import { AboutBackLinkSection } from "@/app/about/_components/AboutBackLinkSection";

export const metadata: Metadata = {
  title: "About | Do Not Ghost Me",
  description:
    "Do Not Ghost Me is a project to track and surface ghosting by companies and HR during job search processes, and to push for more respectful hiring practices.",
};

/**
 * About page entrypoint.
 * Responsible only for composing route-level sections.
 */
export default function AboutPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:px-8 md:py-16">
      <AboutIntroSection />
      <AboutProblemAndHelpSection />
      <AboutPrivacySection />
      <AboutContributeSection />
      <AboutBackLinkSection />
    </div>
  );
}
