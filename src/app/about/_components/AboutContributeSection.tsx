// src/app/about/_components/AboutContributeSection.tsx
import type { JSX } from "react";
import { GithubCta } from "@/components/GithubCta";

/**
 * Section explaining how to contribute to the project.
 */
export function AboutContributeSection(): JSX.Element {
  return (
    <section className="mt-10 space-y-4">
      <h2 className="text-lg font-semibold text-primary">How to contribute</h2>

      <p className="text-sm text-secondary">
        The platform is currently being built as an open-source project. If you want to help shape
        it, report issues or just reach out, you can use the GitHub repository:
      </p>

      <ul className="list-disc space-y-2 pl-5 text-sm text-secondary">
        <li>Open issues with ideas, bug reports or UX feedback.</li>
        <li>Suggest data fields or metrics that would make the stats useful.</li>
        <li>Submit pull requests if you want to contribute code or docs.</li>
        <li>Use GitHub to contact me directly if you have questions or want to collaborate.</li>
      </ul>

      <GithubCta />
    </section>
  );
}
