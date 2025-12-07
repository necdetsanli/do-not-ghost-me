"use client";

import type { JSX, FormEvent } from "react";
import { useState } from "react";
import {
  POSITION_CATEGORY_OPTIONS,
  JOB_LEVEL_OPTIONS,
  STAGE_OPTIONS,
  labelForCategory,
  labelForJobLevel,
  labelForStage,
} from "@/lib/enums";
import {
  CountrySelect,
  homeFormLabelStyle,
  homeInputStyle,
} from "./HomePageComponents";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

type ErrorResponse = {
  error?: string;
  details?: {
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
  };
};

/**
 * HomePage renders the main "Ghost Report" form.
 *
 * It:
 * - Collects a minimal, privacy-friendly report about recruitment ghosting.
 * - Uses enums for stages, job levels and position categories.
 * - Uses a custom CountrySelect combobox that filters by prefix and submits
 *   an ISO CountryCode value to the API.
 */
export default function HomePage(): JSX.Element {
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Country is provided as a CountryCode enum value via CountrySelect's hidden input.
    const rawCountryCode = String(formData.get("country") ?? "").trim();

    const payload = {
      companyName: String(formData.get("companyName") ?? "").trim(),
      stage: String(formData.get("stage") ?? "OTHER"),
      jobLevel: String(formData.get("jobLevel") ?? "OTHER"),
      positionCategory: String(formData.get("positionCategory") ?? "OTHER"),
      positionDetail: String(formData.get("positionDetail") ?? "").trim(),
      daysWithoutReply: String(formData.get("daysWithoutReply") ?? "0"),
      // Send undefined if the user did not select a country.
      country: rawCountryCode === "" ? undefined : rawCountryCode,
      honeypot: String(formData.get("hp") ?? ""), // hidden honeypot field
    };

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatus("success");
        setErrorMessage(null);
        form.reset();
      } else {
        const data = (await res.json().catch(() => ({}))) as ErrorResponse;
        setStatus("error");

        const details = data.details;
        if (details != null && details.fieldErrors != null) {
          const firstFieldError = Object.values(details.fieldErrors)
            .flat()
            .find(Boolean);

          if (firstFieldError != null && firstFieldError !== "") {
            setErrorMessage(firstFieldError);
            return;
          }
        }

        if (
          details != null &&
          details.formErrors != null &&
          details.formErrors.length > 0
        ) {
          const firstFormError = details.formErrors[0];
          setErrorMessage(
            firstFormError != null && firstFormError !== ""
              ? firstFormError
              : "Something went wrong.",
          );
          return;
        }

        setErrorMessage(
          data.error != null && data.error !== ""
            ? data.error
            : "Something went wrong.",
        );
      }
    } catch (err) {
      console.error("Failed to submit report", err);
      setStatus("error");
      setErrorMessage("Network error while submitting the report.");
    }
  }

  return (
    <main
      style={{
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        maxWidth: "640px",
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: 700,
          marginBottom: "1rem",
        }}
      >
        Ghost Report
      </h1>

      <p style={{ marginBottom: "0.75rem" }}>
        Report when a company has ghosted you. We only collect minimal data and
        do not store personal information.
      </p>

      <p
        style={{
          marginBottom: "1.5rem",
          fontSize: "0.9rem",
          color: "#4b5563",
        }}
      >
        You can see aggregated stats on{" "}
        <a
          href="/top-companies"
          style={{ textDecoration: "underline", color: "#2563eb" }}
        >
          top ghosting companies
        </a>
        .
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <label style={homeFormLabelStyle}>
          <span>Company name</span>
          <input
            name="companyName"
            required
            maxLength={120}
            style={homeInputStyle}
          />
        </label>

        <label style={homeFormLabelStyle}>
          <span>Stage</span>
          <select name="stage" defaultValue="TECHNICAL" style={homeInputStyle}>
            {STAGE_OPTIONS.map((stage) => (
              <option key={stage} value={stage}>
                {labelForStage(stage)}
              </option>
            ))}
          </select>
        </label>

        <label style={homeFormLabelStyle}>
          <span>Job level</span>
          <select name="jobLevel" defaultValue="JUNIOR" style={homeInputStyle}>
            {JOB_LEVEL_OPTIONS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {labelForJobLevel(lvl)}
              </option>
            ))}
          </select>
        </label>

        <label style={homeFormLabelStyle}>
          <span>Position category</span>
          <select
            name="positionCategory"
            defaultValue="SOFTWARE_ENGINEERING"
            style={homeInputStyle}
          >
            {POSITION_CATEGORY_OPTIONS.map((cat) => (
              <option key={cat} value={cat}>
                {labelForCategory(cat)}
              </option>
            ))}
          </select>
        </label>

        <label style={homeFormLabelStyle}>
          <span>Position detail (e.g. Backend Developer)</span>
          <input
            name="positionDetail"
            required
            maxLength={80}
            style={homeInputStyle}
          />
        </label>

        <label style={homeFormLabelStyle}>
          <span>Days without reply</span>
          <input
            type="number"
            name="daysWithoutReply"
            min={1}
            max={365}
            required
            style={homeInputStyle}
          />
        </label>

        {/* New type-ahead country selector (prefix match only) */}
        <CountrySelect name="country" />

        {/* Honeypot field for bots */}
        <div style={{ display: "none" }}>
          <label>
            Leave this field empty
            <input name="hp" />
          </label>
        </div>

        <button
          type="submit"
          disabled={status === "submitting"}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: 4,
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            background: "#111827",
            color: "#ffffff",
            marginTop: "0.5rem",
          }}
        >
          {status === "submitting" ? "Submitting..." : "Submit report"}
        </button>

        {status === "success" && (
          <p style={{ color: "green", marginTop: "0.5rem" }}>
            Thank you. Your report has been recorded.
          </p>
        )}

        {status === "error" && (
          <p style={{ color: "red", marginTop: "0.5rem" }}>
            {errorMessage != null ? errorMessage : "Something went wrong."}
          </p>
        )}
      </form>
    </main>
  );
}
