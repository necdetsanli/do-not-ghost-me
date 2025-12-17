// tests/unit/reportForm.test.tsx
// @vitest-environment jsdom
import "../setup/test-dom";
import type { JSX } from "react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

const { dispatchSpy } = vi.hoisted(() => ({
  dispatchSpy: vi.fn(),
}));

/**
 * Minimal Card mock.
 */
vi.mock("@/components/Card", () => ({
  Card: (props: { children: JSX.Element | JSX.Element[] }) => (
    <div data-testid="card">{props.children}</div>
  ),
}));

/**
 * Minimal Alert mock.
 */
vi.mock("@/components/Alert", () => ({
  Alert: (props: { type: string; message: string; onClose: () => void }) => (
    <div data-testid={`alert-${props.type}`}>
      <span>{props.message}</span>
      <button
        type="button"
        data-testid={`alert-${props.type}-close`}
        onClick={props.onClose}
      >
        close
      </button>
    </div>
  ),
}));

/**
 * Minimal Button mock.
 */
vi.mock("@/components/Button", () => ({
  Button: (props: {
    type?: "button" | "submit";
    disabled?: boolean;
    className?: string;
    variant?: string;
    children: JSX.Element | string;
  }) => (
    <button type={props.type ?? "button"} disabled={props.disabled === true}>
      {props.children}
    </button>
  ),
}));

/**
 * Minimal Input mock.
 */
vi.mock("@/components/Input", () => ({
  Input: (props: {
    label: string;
    name: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    isRequired?: boolean;
    min?: number;
    max?: number;
    maxLength?: number;
  }) => (
    <label>
      <span>{props.label}</span>
      <input
        aria-label={props.label}
        name={props.name}
        type={props.type ?? "text"}
        placeholder={props.placeholder}
        required={props.isRequired === true || props.required === true}
        min={props.min}
        max={props.max}
        maxLength={props.maxLength}
      />
    </label>
  ),
}));

/**
 * Minimal Select mock.
 */
vi.mock("@/components/Select", () => ({
  Select: (props: {
    label: string;
    name: string;
    defaultValue?: string;
    isRequired?: boolean;
    options: Array<{ value: string; label: string }>;
  }) => (
    <label>
      <span>{props.label}</span>
      <select
        aria-label={props.label}
        name={props.name}
        defaultValue={props.defaultValue ?? ""}
        required={props.isRequired === true}
      >
        {props.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

/**
 * Minimal CountrySelect mock.
 *
 * - Writes to <input name="country" />
 * - Calls onChangeCode so ReportForm's selectedCountryCode guard passes.
 */
vi.mock("@/components/CountrySelect", () => ({
  CountrySelect: (props: {
    name: string;
    isRequired?: boolean;
    onChangeCode: (code: string) => void;
  }) => (
    <label>
      <span>Country</span>
      <input
        aria-label="Country"
        name={props.name}
        required={props.isRequired === true}
        onInput={(e) => {
          props.onChangeCode(e.currentTarget.value);
        }}
        onChange={(e) => {
          props.onChangeCode(e.currentTarget.value);
        }}
      />
    </label>
  ),
}));

/**
 * Minimal CompanyAutocompleteInput mock.
 *
 * Controlled input that writes to the named form field.
 */
vi.mock("@/app/_components/CompanyAutocompleteInput", () => ({
  CompanyAutocompleteInput: (props: {
    name: string;
    label: string;
    value: string;
    onValueChange: (next: string) => void;
    placeholder?: string;
    required?: boolean;
    isRequired?: boolean;
    maxLength?: number;
  }) => (
    <label>
      <span>{props.label}</span>
      <input
        aria-label={props.label}
        name={props.name}
        value={props.value}
        placeholder={props.placeholder}
        required={props.isRequired === true || props.required === true}
        maxLength={props.maxLength}
        onInput={(e) => {
          props.onValueChange(e.currentTarget.value);
        }}
        onChange={(e) => {
          props.onValueChange(e.currentTarget.value);
        }}
      />
    </label>
  ),
}));

import { ReportForm } from "@/app/_components/ReportForm";

const REPORT_SUBMITTED_EVENT_NAME: string = "dngm:report-submitted";

/**
 * Sets an <input> value using the native setter (required for React-controlled inputs in tests).
 *
 * @param el - Target input element.
 * @param value - Value to set.
 * @returns void
 */
function setNativeInputValue(el: HTMLInputElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  );
  const setter = descriptor?.set;
  if (typeof setter === "function") {
    setter.call(el, value);
    return;
  }
  el.value = value;
}

/**
 * Sets a <select> value using the native setter.
 *
 * @param el - Target select element.
 * @param value - Value to set.
 * @returns void
 */
function setNativeSelectValue(el: HTMLSelectElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    "value",
  );
  const setter = descriptor?.set;
  if (typeof setter === "function") {
    setter.call(el, value);
    return;
  }
  el.value = value;
}

/**
 * Dispatches React-friendly events for an <input>.
 *
 * @param el - Target input element.
 * @param value - Value to set.
 * @returns void
 */
function fireInput(el: HTMLInputElement, value: string): void {
  setNativeInputValue(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Dispatches React-friendly events for a <select>.
 *
 * @param el - Target select element.
 * @param value - New value to select.
 * @returns void
 */
function fireSelect(el: HTMLSelectElement, value: string): void {
  setNativeSelectValue(el, value);
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Flush microtasks/macrotasks once for async React updates.
 *
 * @returns Promise resolved after a tick.
 */
async function flushOnce(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), 0);
  });
}

/**
 * True if the custom report-submitted event was dispatched.
 *
 * @returns boolean
 */
function wasReportSubmittedEventDispatched(): boolean {
  return dispatchSpy.mock.calls.some((call) => {
    const [evt] = call;
    return evt instanceof Event && evt.type === REPORT_SUBMITTED_EVENT_NAME;
  });
}

type HumanFormValues = {
  companyName?: string;
  positionDetail?: string;
  country?: string | null;
  honeypot?: string;
};

/**
 * Fills the required form fields for a "human" submission.
 *
 * Notes:
 * - country: null means do NOT fill it (selectedCountryCode stays "").
 *
 * @param container - Render container.
 * @param values - Field overrides.
 * @returns void
 */
function fillHumanForm(
  container: HTMLDivElement,
  values: HumanFormValues,
): void {
  const companyInput = container.querySelector(
    'input[name="companyName"]',
  ) as HTMLInputElement;

  const positionDetailInput = container.querySelector(
    'input[name="positionDetail"]',
  ) as HTMLInputElement;

  const countryInput = container.querySelector(
    'input[name="country"]',
  ) as HTMLInputElement;

  const honeypotInput = container.querySelector(
    'input[name="hp"]',
  ) as HTMLInputElement;

  const stageSelect = container.querySelector(
    'select[name="stage"]',
  ) as HTMLSelectElement;

  const jobLevelSelect = container.querySelector(
    'select[name="jobLevel"]',
  ) as HTMLSelectElement;

  const categorySelect = container.querySelector(
    'select[name="positionCategory"]',
  ) as HTMLSelectElement;

  expect(companyInput).toBeTruthy();
  expect(stageSelect).toBeTruthy();
  expect(jobLevelSelect).toBeTruthy();
  expect(categorySelect).toBeTruthy();
  expect(positionDetailInput).toBeTruthy();
  expect(countryInput).toBeTruthy();
  expect(honeypotInput).toBeTruthy();

  fireInput(companyInput, values.companyName ?? "Acme");
  fireSelect(stageSelect, stageSelect.options[1]?.value ?? "OTHER");
  fireSelect(jobLevelSelect, jobLevelSelect.options[1]?.value ?? "OTHER");
  fireSelect(categorySelect, categorySelect.options[1]?.value ?? "OTHER");
  fireInput(positionDetailInput, values.positionDetail ?? "Backend Developer");

  if (values.country !== null) {
    fireInput(countryInput, values.country ?? "TR");
  }

  fireInput(honeypotInput, values.honeypot ?? "");
}

describe("ReportForm", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  let dispatchEventSpy: ReturnType<
    typeof vi.spyOn<typeof window, "dispatchEvent">
  > | null = null;

  /**
   * Renders the ReportForm into the test container.
   *
   * @returns Promise resolved after render.
   */
  async function renderForm(): Promise<void> {
    await act(async () => {
      root = createRoot(container as HTMLDivElement);
      root.render(<ReportForm />);
    });
  }

  /**
   * Submits the form (React-friendly) and flushes one tick.
   *
   * @returns Promise resolved after submit + flush.
   */
  async function submitForm(): Promise<void> {
    const form = (container as HTMLDivElement).querySelector(
      "form",
    ) as HTMLFormElement;

    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await flushOnce();
    });
  }

  /**
   * Gets an alert element by type.
   *
   * @param type - "success" or "error".
   * @returns The alert element or null.
   */
  function getAlert(type: "success" | "error"): HTMLDivElement | null {
    return (container as HTMLDivElement).querySelector(
      `[data-testid="alert-${type}"]`,
    );
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);

    vi.restoreAllMocks();
    dispatchSpy.mockReset();

    dispatchEventSpy = vi
      .spyOn(window, "dispatchEvent")
      .mockImplementation((evt: Event) => {
        dispatchSpy(evt);
        return true;
      });
  });

  afterEach(() => {
    if (root !== null) {
      void act(() => {
        root?.unmount();
      });
    }

    if (container !== null) {
      container.remove();
    }

    root = null;
    container = null;
    dispatchEventSpy = null;

    vi.restoreAllMocks();
  });

  it("does not call fetch and does not dispatch event when honeypot is filled", async () => {
    let nowMs: number = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    const fetchMock = vi.fn();
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    await renderForm();

    await act(async () => {
      fillHumanForm(container as HTMLDivElement, {
        companyName: "Acme",
        positionDetail: "Backend Developer",
        country: "TR",
        honeypot: "bot",
      });
    });

    nowMs = 6_500;

    await submitForm();

    expect(fetchMock).toHaveBeenCalledTimes(0);
    expect(wasReportSubmittedEventDispatched()).toBe(false);
    expect(getAlert("success")).toBeTruthy();
  });

  it("calls fetch once and dispatches event when honeypot is empty and API returns 200", async () => {
    let nowMs: number = 10_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    await renderForm();

    await act(async () => {
      fillHumanForm(container as HTMLDivElement, {
        companyName: "Globex",
        positionDetail: "DevOps Engineer",
        country: "TR",
        honeypot: "",
      });
    });

    nowMs = 15_500;

    await submitForm();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(wasReportSubmittedEventDispatched()).toBe(true);
    expect(getAlert("success")).toBeTruthy();
  });

  it("does not call fetch and does not dispatch event for too-fast submissions", async () => {
    vi.spyOn(Date, "now").mockImplementation(() => 1_000);

    const fetchMock = vi.fn();
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    await renderForm();

    await submitForm();

    expect(fetchMock).toHaveBeenCalledTimes(0);
    expect(wasReportSubmittedEventDispatched()).toBe(false);
    expect(getAlert("success")).toBeTruthy();
  });

  it("shows a client-side error when country is not selected (selectedCountryCode guard)", async () => {
    let nowMs: number = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    const fetchMock = vi.fn();
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    await renderForm();

    await act(async () => {
      fillHumanForm(container as HTMLDivElement, {
        companyName: "NoCountry Inc",
        positionDetail: "Backend Dev",
        country: null,
        honeypot: "",
      });
    });

    nowMs = 6_500;

    await submitForm();

    expect(fetchMock).toHaveBeenCalledTimes(0);
    expect(wasReportSubmittedEventDispatched()).toBe(false);

    const alert = getAlert("error");
    expect(alert).toBeTruthy();
    expect(alert?.textContent ?? "").toContain(
      "Please select a country from the list.",
    );
  });

  it("shows first field error when API returns non-OK with details.fieldErrors", async () => {
    let nowMs: number = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        details: { fieldErrors: { companyName: ["Company is required."] } },
      }),
    });

    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    await renderForm();

    await act(async () => {
      fillHumanForm(container as HTMLDivElement, {
        companyName: "X",
        positionDetail: "Backend Dev",
        country: "TR",
        honeypot: "",
      });
    });

    nowMs = 6_500;

    await submitForm();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(wasReportSubmittedEventDispatched()).toBe(false);

    const alert = getAlert("error");
    expect(alert).toBeTruthy();
    expect(alert?.textContent ?? "").toContain("Company is required.");
  });

  it("shows first form error when API returns non-OK with details.formErrors", async () => {
    let nowMs: number = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        details: { formErrors: ["Form error happened."] },
      }),
    });

    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    await renderForm();

    await act(async () => {
      fillHumanForm(container as HTMLDivElement, {
        companyName: "Acme",
        positionDetail: "Backend Dev",
        country: "TR",
        honeypot: "",
      });
    });

    nowMs = 6_500;

    await submitForm();

    const alert = getAlert("error");
    expect(alert).toBeTruthy();
    expect(alert?.textContent ?? "").toContain("Form error happened.");
  });

  it("shows data.error when API returns non-OK and provides an error string", async () => {
    let nowMs: number = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal server error" }),
    });

    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    await renderForm();

    await act(async () => {
      fillHumanForm(container as HTMLDivElement, {
        companyName: "Acme",
        positionDetail: "Backend Dev",
        country: "TR",
        honeypot: "",
      });
    });

    nowMs = 6_500;

    await submitForm();

    const alert = getAlert("error");
    expect(alert).toBeTruthy();
    expect(alert?.textContent ?? "").toContain("Internal server error");
  });

  it("falls back to 'Something went wrong.' when API returns non-OK and json() rejects", async () => {
    let nowMs: number = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => {
        throw new Error("bad-json");
      },
    });

    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    await renderForm();

    await act(async () => {
      fillHumanForm(container as HTMLDivElement, {
        companyName: "Acme",
        positionDetail: "Backend Dev",
        country: "TR",
        honeypot: "",
      });
    });

    nowMs = 6_500;

    await submitForm();

    const alert = getAlert("error");
    expect(alert).toBeTruthy();
    expect(alert?.textContent ?? "").toContain("Something went wrong.");
  });

  it("shows a network error message when fetch throws", async () => {
    let nowMs: number = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const fetchMock = vi.fn().mockRejectedValue(new Error("network-down"));
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    await renderForm();

    await act(async () => {
      fillHumanForm(container as HTMLDivElement, {
        companyName: "Acme",
        positionDetail: "Backend Dev",
        country: "TR",
        honeypot: "",
      });
    });

    nowMs = 6_500;

    await submitForm();

    const alert = getAlert("error");
    expect(alert).toBeTruthy();
    expect(alert?.textContent ?? "").toContain(
      "Network error while submitting the report.",
    );

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it("does not crash when dispatchEvent throws inside notifyReportSubmitted()", async () => {
    let nowMs: number = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    dispatchEventSpy?.mockImplementation(() => {
      throw new Error("dispatch-failed");
    });

    await renderForm();

    await act(async () => {
      fillHumanForm(container as HTMLDivElement, {
        companyName: "Acme",
        positionDetail: "Backend Dev",
        country: "TR",
        honeypot: "",
      });
    });

    nowMs = 6_500;

    await submitForm();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAlert("success")).toBeTruthy();
  });

  it("clears the success alert when it is closed (covers clearAlert)", async () => {
    let nowMs: number = 10_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    await renderForm();

    await act(async () => {
      fillHumanForm(container as HTMLDivElement, {
        companyName: "Acme",
        positionDetail: "Backend Dev",
        country: "TR",
        honeypot: "",
      });
    });

    nowMs = 15_500;

    await submitForm();

    expect(getAlert("success")).toBeTruthy();

    const closeBtn = (container as HTMLDivElement).querySelector(
      '[data-testid="alert-success-close"]',
    ) as HTMLButtonElement;

    await act(async () => {
      closeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushOnce();
    });

    expect(getAlert("success")).toBeNull();
  });
  it("shows submitting UI while request is in-flight (covers submitting branch)", async () => {
    let nowMs: number = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    let resolveFetch:
      | ((value: {
          ok: boolean;
          status: number;
          json: () => Promise<unknown>;
        }) => void)
      | null = null;

    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    await act(async () => {
      root = createRoot(container as HTMLDivElement);
      root.render(<ReportForm />);
    });

    const companyInput = container?.querySelector(
      'input[name="companyName"]',
    ) as HTMLInputElement;

    const stageSelect = container?.querySelector(
      'select[name="stage"]',
    ) as HTMLSelectElement;

    const jobLevelSelect = container?.querySelector(
      'select[name="jobLevel"]',
    ) as HTMLSelectElement;

    const categorySelect = container?.querySelector(
      'select[name="positionCategory"]',
    ) as HTMLSelectElement;

    const positionDetailInput = container?.querySelector(
      'input[name="positionDetail"]',
    ) as HTMLInputElement;

    const countryInput = container?.querySelector(
      'input[name="country"]',
    ) as HTMLInputElement;

    const honeypotInput = container?.querySelector(
      'input[name="hp"]',
    ) as HTMLInputElement;

    await act(async () => {
      fireInput(companyInput, "Pending Corp");
    });

    nowMs = 6_500;

    await act(async () => {
      fireSelect(stageSelect, stageSelect.options[1]?.value ?? "OTHER");
      fireSelect(jobLevelSelect, jobLevelSelect.options[1]?.value ?? "OTHER");
      fireSelect(categorySelect, categorySelect.options[1]?.value ?? "OTHER");
      fireInput(positionDetailInput, "DevOps Engineer");
      fireInput(countryInput, "TR");
      fireInput(honeypotInput, "");
    });

    const form = container?.querySelector("form") as HTMLFormElement;

    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const submitButton = container?.querySelector(
      "button[type='submit']",
    ) as HTMLButtonElement | null;

    expect(submitButton).toBeTruthy();
    expect(submitButton?.disabled).toBe(true);
    expect(submitButton?.textContent ?? "").toContain("Submitting...");

    await act(async () => {
      resolveFetch?.({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
      await Promise.resolve();
    });

    const successAlert = container?.querySelector(
      '[data-testid="alert-success"]',
    ) as HTMLDivElement | null;

    expect(successAlert).toBeTruthy();
  });
});
