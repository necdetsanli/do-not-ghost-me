// @vitest-environment jsdom
// tests/unit/useReportsStats.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReportsStats } from "@/app/_hooks/useReportsStats";
import type { ReportsStatsApiResponse } from "@/app/_hooks/useReportsStats";

type MockFetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

/**
 * Creates a minimal Response-like object for fetch mocking.
 *
 * @param body - JSON body to return.
 * @param status - HTTP status code.
 * @returns A Response-like object with ok/status/json().
 */
function makeJsonResponse(
  body: unknown,
  status: number = 200,
): MockFetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

/**
 * Flushes pending microtasks to allow React state updates to settle.
 *
 * @returns A promise that resolves after a couple of microtask ticks.
 */
async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

/**
 * Forces document.hidden to a desired value for testing visibility behavior.
 *
 * @param hidden - Desired hidden state.
 */
function setDocumentHidden(hidden: boolean): void {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: hidden,
  });
}

describe("useReportsStats", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();

    // Default to visible tab.
    setDocumentHidden(false);

    // Mock global fetch.
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    fetchMock.mockReset();
  });

  it("loads stats on mount and exposes success state", async () => {
    const payload: ReportsStatsApiResponse = {
      totalReports: 123,
      mostReportedCompany: { name: "Acme", reportCount: 5 },
    };

    fetchMock.mockResolvedValueOnce(makeJsonResponse(payload, 200));

    const { result } = renderHook(() => useReportsStats());

    await act(async () => {
      await flushMicrotasks();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("success");
    expect(result.current.stats).toEqual(payload);
    expect(result.current.liveError).toBe(false);
  });

  it("polls while visible and stops when hidden; resumes when visible again", async () => {
    vi.useFakeTimers();

    const first: ReportsStatsApiResponse = {
      totalReports: 10,
      mostReportedCompany: null,
    };
    const second: ReportsStatsApiResponse = {
      totalReports: 11,
      mostReportedCompany: null,
    };
    const third: ReportsStatsApiResponse = {
      totalReports: 12,
      mostReportedCompany: null,
    };

    fetchMock
      .mockResolvedValueOnce(makeJsonResponse(first, 200)) // initial
      .mockResolvedValueOnce(makeJsonResponse(second, 200)) // poll #1
      .mockResolvedValueOnce(makeJsonResponse(third, 200)); // after resume

    const { result } = renderHook(() =>
      useReportsStats({ pollIntervalMs: 5_000 }),
    );

    await act(async () => {
      await flushMicrotasks();
    });

    expect(result.current.status).toBe("success");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Poll should fire when visible.
    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await flushMicrotasks();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.stats?.totalReports).toBe(11);

    // Hide the tab: polling must stop.
    await act(async () => {
      setDocumentHidden(true);
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(30_000);
      await flushMicrotasks();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Show again: should refresh immediately and restart timer.
    await act(async () => {
      setDocumentHidden(false);
      document.dispatchEvent(new Event("visibilitychange"));
      await flushMicrotasks();
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.current.stats?.totalReports).toBe(12);
  });

  it("refreshes when the 'dngm:report-submitted' event is dispatched", async () => {
    vi.useFakeTimers();

    const first: ReportsStatsApiResponse = {
      totalReports: 1,
      mostReportedCompany: null,
    };
    const second: ReportsStatsApiResponse = {
      totalReports: 2,
      mostReportedCompany: null,
    };

    fetchMock
      .mockResolvedValueOnce(makeJsonResponse(first, 200))
      .mockResolvedValueOnce(makeJsonResponse(second, 200));

    const { result } = renderHook(() => useReportsStats());

    await act(async () => {
      await flushMicrotasks();
    });

    expect(result.current.stats?.totalReports).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new Event("dngm:report-submitted"));
      await flushMicrotasks();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.stats?.totalReports).toBe(2);
  });

  it("sets liveError on background refresh failure after initial success (status remains success)", async () => {
    vi.useFakeTimers();

    const first: ReportsStatsApiResponse = {
      totalReports: 10,
      mostReportedCompany: null,
    };

    fetchMock
      .mockResolvedValueOnce(makeJsonResponse(first, 200))
      .mockResolvedValueOnce(makeJsonResponse({ error: "boom" }, 500));

    const { result } = renderHook(() => useReportsStats());

    await act(async () => {
      await flushMicrotasks();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.liveError).toBe(false);

    await act(async () => {
      await result.current.refreshNow();
      await flushMicrotasks();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("success");
    expect(result.current.liveError).toBe(true);
    expect(result.current.isRefreshing).toBe(false);
  });

  it("does not update stats reference when values are unchanged (avoids unnecessary re-render)", async () => {
    vi.useFakeTimers();

    const payload: ReportsStatsApiResponse = {
      totalReports: 42,
      mostReportedCompany: { name: "Acme", reportCount: 3 },
    };

    fetchMock
      .mockResolvedValueOnce(makeJsonResponse(payload, 200)) // initial
      .mockResolvedValueOnce(makeJsonResponse({ ...payload }, 200)); // same values

    const { result } = renderHook(() =>
      useReportsStats({ pollIntervalMs: 5_000 }),
    );

    await act(async () => {
      await flushMicrotasks();
    });

    const firstRef = result.current.stats;
    expect(firstRef).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await flushMicrotasks();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.stats).toBe(firstRef);
  });
});
