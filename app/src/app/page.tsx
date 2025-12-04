// app/page.tsx
"use client";

import { FormEvent, useState } from "react";

const STAGES = [
  "CV_SCREEN",
  "FIRST_INTERVIEW",
  "TECHNICAL",
  "HR_INTERVIEW",
  "OFFER",
  "OTHER",
] as const;

const JOB_LEVELS = ["INTERN", "JUNIOR", "MID", "SENIOR", "LEAD", "OTHER"] as const;

const POSITION_CATEGORIES = [
  "SOFTWARE_ENGINEERING",
  "DEVOPS_SRE_PLATFORM",
  "SECURITY",
  "DATA_ML_AI",
  "MOBILE",
  "EMBEDDED_ROBOTICS",
  "QA_TEST",
  "CLOUD_INFRA",
  "PRODUCT",
  "DESIGN",
  "OTHER",
] as const;

export default function Home() {
  const [status, setStatus] = useState<null | "idle" | "submitting" | "success" | "error">(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);

    const payload = {
      companyName: String(formData.get("companyName") || "").trim(),
      stage: String(formData.get("stage") || "OTHER"),
      jobLevel: String(formData.get("jobLevel") || "OTHER"),
      positionCategory: String(formData.get("positionCategory") || "OTHER"),
      positionDetail: String(formData.get("positionDetail") || "").trim(),
      daysWithoutReply: String(formData.get("daysWithoutReply") || "0"),
      country: String(formData.get("country") || "").trim() || undefined,
      honeypot: String(formData.get("hp") || ""), // hidden honeypot field
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
        e.currentTarget.reset();
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setErrorMessage(
          data?.error || "Something went wrong while submitting the report."
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
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1rem" }}>
        Ghost Report
      </h1>
      <p style={{ marginBottom: "1.5rem" }}>
        Report when a company has ghosted you. We only collect minimal data and
        do not store personal information.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span>Company name</span>
          <input
            name="companyName"
            required
            maxLength={120}
            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: 4 }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span>Stage</span>
          <select
            name="stage"
            defaultValue="TECHNICAL"
            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: 4 }}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span>Job level</span>
          <select
            name="jobLevel"
            defaultValue="JUNIOR"
            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: 4 }}
          >
            {JOB_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span>Position category</span>
          <select
            name="positionCategory"
            defaultValue="SOFTWARE_ENGINEERING"
            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: 4 }}
          >
            {POSITION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span>Position detail (e.g. Backend Developer)</span>
          <input
            name="positionDetail"
            required
            maxLength={80}
            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: 4 }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span>Days without reply</span>
          <input
            type="number"
            name="daysWithoutReply"
            min={1}
            max={365}
            required
            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: 4 }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span>Country (optional)</span>
          <input
            name="country"
            maxLength={100}
            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: 4 }}
          />
        </label>

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
            {errorMessage || "Something went wrong."}
          </p>
        )}
      </form>
    </main>
  );
}
