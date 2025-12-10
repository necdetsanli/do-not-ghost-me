"use client";

import type { JSX } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

/**
 * Home page hero section: heading, copy and primary CTAs.
 * Contains all client-only behaviour (scroll + navigation).
 */
export function HomeHero(): JSX.Element {
  const router = useRouter();

  function scrollToForm(): void {
    const formElement = document.getElementById("report-form");
    if (formElement !== null) {
      formElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <h1
          id="home-hero-heading"
          className="text-4xl tracking-tight text-primary md:text-5xl"
        >
          Track ghosting.
          <br />
          Share your experience.
        </h1>
        <p className="text-lg leading-relaxed text-secondary md:text-xl">
          Submit anonymous reports about companies that ghost job applicants.
          Help others know what to expect and hold companies accountable.
        </p>
      </header>

      <div className="flex flex-wrap gap-4">
        <Button
          variant="primary"
          size="lg"
          type="button"
          onClick={scrollToForm}
          aria-label="Scroll to report form"
        >
          Submit a report
        </Button>

        <Button
          variant="secondary"
          size="lg"
          type="button"
          onClick={(): void => {
            router.push("/top-companies");
          }}
        >
          View top companies
        </Button>
      </div>

      <p className="text-xs text-tertiary">
        Reports are anonymous. We store only minimal, non-identifiable metadata
        and use salted hashes of IP addresses for rate limiting instead of
        storing raw IP data.
      </p>
    </div>
  );
}
