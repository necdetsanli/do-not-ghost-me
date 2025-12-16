// src/app/_components/ReportForm.tsx
"use client";

import type { JSX, FormEvent } from "react";
import { useRef, useState } from "react";
import type { CountryCode } from "@prisma/client";
import {
  POSITION_CATEGORY_OPTIONS,
  JOB_LEVEL_OPTIONS,
  STAGE_OPTIONS,
  labelForCategory,
  labelForJobLevel,
  labelForStage,
} from "@/lib/enums";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { CountrySelect } from "@/components/CountrySelect";
import { Button } from "@/components/Button";
import { Alert } from "@/components/Alert";
import { CompanyAutocompleteInput } from "@/app/_components/CompanyAutocompleteInput";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

type ErrorResponse = {
  error?: string;
  details?: {
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
  };
};

const stageSelectOptions = [
  { value: "", label: "Select stage" },
  ...STAGE_OPTIONS.map((stage) => ({
    value: stage,
    label: labelForStage(stage),
  })),
];

const jobLevelSelectOptions = [
  { value: "", label: "Select level" },
  ...JOB_LEVEL_OPTIONS.map((level) => ({
    value: level,
    label: labelForJobLevel(level),
  })),
];

const categorySelectOptions = [
  { value: "", label: "Select category" },
  ...POSITION_CATEGORY_OPTIONS.map((category) => ({
    value: category,
    label: labelForCategory(category),
  })),
];

/** Minimum time (ms) the form should be open / interacted with before submit. */
const MIN_FORM_FILL_TIME_MS: number = 4000;

/** Custom DOM event name dispatched after a successful report submission. */
const REPORT_SUBMITTED_EVENT_NAME: string = "dngm:report-submitted";

/**
 * Notifies other client components (e.g. HomeStats) that a report was submitted successfully.
 * This must never throw or affect the submit flow.
 */
function notifyReportSubmitted(): void {
  try {
    window.dispatchEvent(new Event(REPORT_SUBMITTED_EVENT_NAME));
  } catch {
    // Intentionally ignore: stats refresh is best-effort.
  }
}

/**
 * Ghosting report form for the public home page.
 *
 * Responsibilities:
 * - Render the main report submission form (company, stage, level, etc.).
 * - Perform minimal client-side guards (e.g. country selection).
 * - Submit the payload to the `/api/reports` endpoint as JSON.
 * - Handle success and error states, including honeypot success path.
 *
 * Full validation, rate limiting and persistence are handled server-side
 * via Zod schemas and domain-specific logic.
 */
export function ReportForm(): JSX.Element {
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Used to force-reset the whole form (including CountrySelect internal state).
  const [formResetKey, setFormResetKey] = useState<number>(0);

  // Mirror of CountrySelect internal state to ensure a country is actually selected.
  const [selectedCountryCode, setSelectedCountryCode] = useState<
    CountryCode | ""
  >("");

  // Controlled state for the company name input so that the autocomplete
  // component can manage suggestions while preserving a free-text value.
  const [companyName, setCompanyName] = useState<string>("");

  // Timestamp of the first interaction with the form (used for "too fast" detection).
  const firstInteractionAtRef = useRef<number | null>(null);

  /**
   * Records the timestamp of the first user interaction with the form.
   * This is used to detect submissions that happen "too fast" to be human.
   */
  function markFirstInteraction(): void {
    firstInteractionAtRef.current ??= Date.now();
  }

  /**
   * Handles report form submission:
   * - Prevents default form submission.
   * - Applies a minimum fill-time guard (fast submissions are treated like honeypot).
   * - Ensures that a country has been selected from the CountrySelect.
   * - Builds a JSON payload from the form fields.
   * - Sends the payload to `/api/reports` and interprets the response.
   *
   * Honeypot submissions (bot traffic) still respond with HTTP 200 and are
   * treated as success to avoid leaking validation behavior to bots.
   *
   * @param event - The form submission event.
   */
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const form: HTMLFormElement = event.currentTarget;

    // Minimum fill-time guard: if the user submits "too fast", behave like honeypot.
    const now: number = Date.now();
    const firstInteractionAt: number | null = firstInteractionAtRef.current;

    const hasMinimumFillTime: boolean =
      firstInteractionAt !== null &&
      now - firstInteractionAt >= MIN_FORM_FILL_TIME_MS;

    if (hasMinimumFillTime === false) {
      // Treat as a bot-like submission:
      // - Do NOT call the API (no database write).
      // - Show success and reset the form to avoid leaking behavior.
      setStatus("success");
      setErrorMessage(null);

      form.reset();
      setSelectedCountryCode("");
      setCompanyName("");
      setFormResetKey((key: number): number => key + 1);
      firstInteractionAtRef.current = null;

      return;
    }

    setStatus("submitting");
    setErrorMessage(null);

    // Basic guard to ensure the user picked a country from the list.
    if (selectedCountryCode === "") {
      setStatus("error");
      setErrorMessage("Please select a country from the list.");
      return;
    }

    const formData: FormData = new FormData(form);

    const rawCountryCode: string = String(formData.get("country") ?? "").trim();

    const rawDaysWithoutReply: string = String(
      formData.get("daysWithoutReply") ?? "",
    ).trim();

    const daysWithoutReply: string | null =
      rawDaysWithoutReply === "" ? null : rawDaysWithoutReply;

    const payload = {
      companyName: String(formData.get("companyName") ?? "").trim(),
      stage: String(formData.get("stage") ?? "OTHER"),
      jobLevel: String(formData.get("jobLevel") ?? "OTHER"),
      positionCategory: String(formData.get("positionCategory") ?? "OTHER"),
      positionDetail: String(formData.get("positionDetail") ?? "").trim(),
      daysWithoutReply,
      country: rawCountryCode,
      honeypot: String(formData.get("hp") ?? "").trim(),
    };

    try {
      const res: Response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Honeypot path returns 200, which is still ok → treat as success.
      if (res.ok === true) {
        setStatus("success");
        setErrorMessage(null);

        form.reset();
        setSelectedCountryCode("");
        setCompanyName("");
        setFormResetKey((key: number): number => key + 1);
        firstInteractionAtRef.current = null;
        notifyReportSubmitted();

        return;
      }

      const data = (await res.json().catch(() => ({}))) as ErrorResponse;
      setStatus("error");

      const details = data.details;

      if (details?.fieldErrors !== undefined) {
        const firstFieldError = Object.values(details.fieldErrors)
          .flat()
          .find((msg) => typeof msg === "string" && msg.length > 0);

        if (typeof firstFieldError === "string") {
          setErrorMessage(firstFieldError);
          return;
        }
      }

      if (
        details?.formErrors !== undefined &&
        details.formErrors.length > 0 &&
        typeof details.formErrors[0] === "string" &&
        details.formErrors[0].length > 0
      ) {
        setErrorMessage(details.formErrors[0]);
        return;
      }

      if (typeof data.error === "string" && data.error.length > 0) {
        setErrorMessage(data.error);
      } else {
        setErrorMessage("Something went wrong.");
      }
    } catch (error) {
      // Network or fetch-level error: log to console for client-side debugging only.
      // Server-side logging and alerting remain in the API route implementations.
      console.error("Failed to submit report", error);
      setStatus("error");
      setErrorMessage("Network error while submitting the report.");
    }
  }

  /**
   * Clears the current alert state and returns the form status to idle.
   */
  function clearAlert(): void {
    setStatus("idle");
    setErrorMessage(null);
  }

  return (
    <section
      id="report-form"
      className="mx-auto max-w-3xl px-6 pb-24 md:px-8"
      aria-labelledby="form-heading"
    >
      <Card>
        <div className="space-y-6">
          <header className="space-y-2">
            <h2 id="form-heading" className="text-2xl text-primary">
              Submit a report
            </h2>
            <p className="text-sm text-secondary">
              All reports are anonymous. We collect minimal data and apply rate
              limiting to prevent abuse. You can browse aggregated statistics on{" "}
              <a
                href="/companies"
                className="font-medium text-[var(--color-primary-600)] underline"
              >
                companies
              </a>
              .
            </p>
          </header>

          {/* Alert area */}
          {status === "success" && (
            <Alert
              type="success"
              message="Thank you. Your report has been recorded."
              onClose={clearAlert}
            />
          )}

          {status === "error" && (
            <Alert
              type="error"
              message={errorMessage ?? "Something went wrong."}
              onClose={clearAlert}
            />
          )}

          <form
            key={formResetKey}
            onSubmit={handleSubmit}
            onChange={markFirstInteraction}
            className="space-y-6"
            aria-label="Ghosting report form"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Company name (free-text with suggestions) */}
              <div className="md:col-span-2">
                <CompanyAutocompleteInput
                  name="companyName"
                  label="Company name"
                  value={companyName}
                  onValueChange={setCompanyName}
                  placeholder="e.g. TechCorp Inc"
                  required={true}
                  isRequired={true}
                  maxLength={120}
                />
              </div>

              {/* Stage (enum) */}
              <Select
                label="Stage"
                name="stage"
                defaultValue=""
                isRequired
                options={stageSelectOptions}
              />

              {/* Job level (enum) */}
              <Select
                label="Job level"
                name="jobLevel"
                defaultValue=""
                isRequired
                options={jobLevelSelectOptions}
              />

              {/* Position category (enum) */}
              <Select
                label="Position category"
                name="positionCategory"
                defaultValue=""
                isRequired
                options={categorySelectOptions}
              />

              {/* Position detail */}
              <Input
                label="Position detail"
                name="positionDetail"
                placeholder="e.g. Backend Developer"
                required
                isRequired
                maxLength={80}
              />

              {/* Days without reply (optional) */}
              <Input
                label="Days without reply (optional)"
                name="daysWithoutReply"
                type="number"
                placeholder="e.g. 30"
                min={1}
                max={365}
              />

              {/* CountrySelect (CountryCode enum, type-ahead) */}
              <div className="md:col-span-2">
                <CountrySelect
                  name="country"
                  isRequired
                  onChangeCode={setSelectedCountryCode}
                />
              </div>
            </div>

            {/* Honeypot field (bot detection) */}
            <div className="hidden">
              <label className="text-sm">
                Leave this field empty
                <input name="hp" />
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Submitting..." : "Submit report"}
            </Button>
          </form>
        </div>
      </Card>
    </section>
  );
}
