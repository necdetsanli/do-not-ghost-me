// src/app/about/_components/AboutPrivacySection.tsx
import type { JSX } from "react";

/**
 * Section describing privacy and data handling.
 */
export function AboutPrivacySection(): JSX.Element {
  return (
    <section className="mt-10 space-y-3">
      <h2 className="text-lg font-semibold">Privacy &amp; data</h2>
      <p className="text-sm text-muted-foreground">
        The project is focused on <strong>patterns and aggregated data</strong>,
        not on exposing individuals. When describing your experience, you should
        avoid sharing:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Full names of specific people (recruiters, managers, etc.).</li>
        <li>Phone numbers, email addresses or other direct contact details.</li>
        <li>Exact addresses or any highly sensitive personal information.</li>
      </ul>
      <p className="text-sm text-muted-foreground">
        Focus on the{" "}
        <strong>company, process, timeline and what happened</strong>, not on
        doxxing individuals. The goal is to highlight systemic behavior, not to
        start personal harassment campaigns.
      </p>
      <p className="text-sm text-muted-foreground">
        Reports are stored without creating user profiles or accounts. The
        application does not ask for or intentionally store personal data about
        the people who submit reports (such as your name, email address or
        contact details). We apply IP-based rate limiting using{" "}
        <strong>salted hashes of IP addresses</strong> rather than storing raw
        IPs. The interest is in aggregated behavior of companies and HR
        processes, not in tracking you as an individual candidate.
      </p>
    </section>
  );
}
