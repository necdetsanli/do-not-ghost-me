// src/app/about/_components/AboutIntroSection.tsx
import type { JSX } from "react";

/**
 * Intro section explaining what Do Not Ghost Me is.
 */
export function AboutIntroSection(): JSX.Element {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight text-primary md:text-4xl">
        About <span className="text-primary">Do Not Ghost Me</span>
      </h1>

      <p className="text-base text-secondary">
        Do Not Ghost Me is a project for job seekers who get ghosted by
        companies and HR teams during hiring processes. When you invest time in
        applications, take-home tasks and interviews, completely losing
        communication is not just rude – it is emotionally exhausting and, in my
        opinion, not something we should accept as “normal”.
      </p>

      <p className="text-base text-secondary">
        The goal of this project is to create a place where these experiences
        can be reported in a structured way and turned into data:{" "}
        <strong>patterns, statistics and insights</strong> about how often
        ghosting happens, at which stages, and how it affects candidates.
      </p>
    </section>
  );
}
