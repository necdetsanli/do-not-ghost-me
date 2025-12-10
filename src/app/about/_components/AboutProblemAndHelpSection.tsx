// src/app/about/_components/AboutProblemAndHelpSection.tsx
import type { JSX } from "react";

/**
 * Section describing the problem and how the project helps.
 * Renders two cards side-by-side on larger screens.
 */
export function AboutProblemAndHelpSection(): JSX.Element {
  return (
    <section className="mt-10 grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border border-primary bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">
          The problem: ghosting in hiring
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-secondary">
          <li>
            Candidates often invest hours or weeks of work into applications,
            tests and interviews, only to suddenly stop hearing anything back.
          </li>
          <li>
            This creates stress, self-doubt and uncertainty on top of an already
            difficult job search.
          </li>
          <li>
            Because ghosting is so common, many people quietly accept it as part
            of the process, even though it is a very poor way to treat
            applicants.
          </li>
          <li>
            There is usually no transparent record of how companies behave, so
            candidates have very little information before applying.
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-primary bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">
          How this project tries to help
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-secondary">
          <li>
            Provide a simple way for candidates to document when and where they
            were ghosted (stage, company, role details, timeline).
          </li>
          <li>
            Aggregate these reports into statistics and visualizations instead
            of leaving experiences as isolated stories.
          </li>
          <li>
            Make ghosting more visible so candidates can set expectations and
            think twice before investing time into companies with a bad track
            record.
          </li>
          <li>
            Encourage more respectful hiring practices by showing that silent
            drop-offs are noticed and remembered, not forgotten.
          </li>
        </ul>
      </div>
    </section>
  );
}
