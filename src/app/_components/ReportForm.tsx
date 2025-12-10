// src/app/_components/ReportForm.tsx
"use client";

import type { JSX, FormEvent } from "react";
import { useState } from "react";
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

/**
 * Report form section for the home page.
 * Handles client-side validation, submission and success/error states.
 */
export function ReportForm(): JSX.Element {
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Used to force-reset the whole form (including CountrySelect internal state).
  const [formResetKey, setFormResetKey] = useState(0);

  // Mirror of CountrySelect internal state to ensure a country is actually selected.
  const [selectedCountryCode, setSelectedCountryCode] = useState<
    CountryCode | ""
  >("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    // Basic guard to ensure the user picked a country from the list.
    if (selectedCountryCode === "") {
      setStatus("error");
      setErrorMessage("Please select a country from the list.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    const rawCountryCode = String(formData.get("country") ?? "").trim();

    const rawDaysWithoutReply = String(
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
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Honeypot path returns 200, which is still ok → treat as success.
      if (res.ok) {
        setStatus("success");
        setErrorMessage(null);

        form.reset();
        setSelectedCountryCode("");
        setFormResetKey((key) => key + 1);
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
      console.error("Failed to submit report", error);
      setStatus("error");
      setErrorMessage("Network error while submitting the report.");
    }
  }

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
                href="/top-companies"
                className="font-medium text-[var(--color-primary-600)] underline"
              >
                top companies
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
            className="space-y-6"
            aria-label="Ghosting report form"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Company name */}
              <div className="md:col-span-2">
                <Input
                  label="Company name"
                  name="companyName"
                  placeholder="e.g. TechCorp Inc"
                  required
                  isRequired
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
