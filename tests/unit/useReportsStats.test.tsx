// tests/unit/useReportsStats.test.tsx
// @vitest-environment jsdom
import "../setup/test-dom";
import type { JSX } from "react";
import { act, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

import type { ReportsStatsApiResponse, StatsStatus } from "@/app/_hooks/useReportsStats";

type HookSnapshot = {
  stats: ReportsStatsApiResponse | null;
  status: StatsStatus;
  isRefreshing: boolean;
  liveError: boolean;
  refreshNow: () => Promise<void>;
};

type UseReportsStatsHook = () => HookSnapshot;

type FetchQueueItem = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

/**
 * Imports useReportsStats with a fresh module graph.
 * This prevents module-level cache/state from leaking across tests.
 *
 * @returns The hook function.
 */
async function importUseReportsStatsFresh(): Promise<UseReportsStatsHook> {
  vi.resetModules();
  const mod = await import("@/app/_hooks/useReportsStats");
  return mod.useReportsStats as unknown as UseReportsStatsHook;
}

/**
 * Sleeps for the given duration (ms).
 *
 * @param ms - Duration in milliseconds.
 * @returns Promise resolved after the delay.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Flushes one macrotask within React.act so state updates are wrapped properly.
 *
 * @returns Promise resolved after one tick.
 */
async function tick(): Promise<void> {
  await act(async () => {
    await sleep(0);
  });
}

/**
 * Waits until the predicate becomes true or times out.
 *
 * @param predicate - Condition to satisfy.
 * @param timeoutMs - Timeout in milliseconds.
 * @returns Promise resolved once predicate is true.
 * @throws Error when timed out.
 */
async function waitFor(predicate: () => boolean, timeoutMs: number): Promise<void> {
  const startedAt: number = performance.now();

  while (predicate() !== true) {
    const elapsedMs: number = performance.now() - startedAt;

    if (elapsedMs > timeoutMs) {
      throw new Error("waitFor: timed out");
    }

    await tick();
  }
}

/**
 * Creates a deferred promise for manual resolve/reject control.
 *
 * @returns Deferred wrapper.
 */
function createDeferred<T>(): Deferred<T> {
  let resolveFn!: (value: T) => void;
  let rejectFn!: (reason: unknown) => void;

  const promise = new Promise<T>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  return {
    promise,
    resolve: (value: T) => {
      resolveFn(value);
    },
    reject: (reason: unknown) => {
      rejectFn(reason);
    },
  };
}

/**
 * Hook harness used to observe hook state over time.
 *
 * @param props - Harness props.
 * @returns null (no UI).
 */
function Harness(props: {
  useHook: UseReportsStatsHook;
  onUpdate: (snapshot: HookSnapshot) => void;
}): JSX.Element | null {
  const { useHook, onUpdate } = props;
  const { stats, status, isRefreshing, liveError, refreshNow } = useHook();

  useEffect(() => {
    onUpdate({ stats, status, isRefreshing, liveError, refreshNow });
  }, [onUpdate, stats, status, isRefreshing, liveError, refreshNow]);

  return null;
}

/**
 * Mocks global fetch with a FIFO queue of responses, consumed in call order.
 * Also performs basic sanity checks on the requested URL.
 *
 * @param queue - Fetch responses to serve.
 * @returns The fetch mock.
 */
function mockFetchQueue(queue: FetchQueueItem[]): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockImplementation((url: unknown) => {
    const next = queue.shift();
    if (next === undefined) {
      return Promise.reject(new Error("fetch-queue-empty"));
    }

    if (typeof url === "string") {
      expect(url.includes("/api/reports/stats")).toBe(true);
      expect(url.includes("_ts=")).toBe(true);
    }

    return Promise.resolve(next);
  });

  (globalThis as unknown as { fetch: unknown }).fetch = fn;

  return fn;
}

/**
 * Sets document.visibilityState (jsdom allows overriding via defineProperty).
 *
 * @param state - The desired visibility state.
 * @returns void
 */
function setVisibilityState(state: "visible" | "hidden"): void {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
}

describe("useReportsStats", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root !== null) {
      act(() => {
        root?.unmount();
      });
    }

    if (container !== null) {
      container.remove();
    }

    root = null;
    container = null;

    vi.restoreAllMocks();
  });

  /**
   * Mounts a Harness with an explicit root so we can unmount reliably per test.
   *
   * @param useHook - Hook function.
   * @returns Latest snapshot accessor.
   */
  async function renderHarness(useHook: UseReportsStatsHook): Promise<{
    latestRef: { current: HookSnapshot | null };
  }> {
    const latestRef = { current: null as HookSnapshot | null };

    await act(async () => {
      root = createRoot(container as HTMLDivElement);
      root.render(
        <Harness
          useHook={useHook}
          onUpdate={(s) => {
            latestRef.current = s;
          }}
        />,
      );
    });

    return { latestRef };
  }

  it("fetches once on mount and sets status=success with parsed stats", async () => {
    const useReportsStats = await importUseReportsStatsFresh();

    const payload: ReportsStatsApiResponse = {
      totalReports: 123,
      mostReportedCompany: { name: "Acme", reportCount: 7 },
    };

    const fetchMock = mockFetchQueue([{ ok: true, status: 200, json: async () => payload }]);

    const { latestRef } = await renderHarness(useReportsStats);

    await waitFor(() => latestRef.current?.status === "success", 1000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latestRef.current?.stats).toEqual(payload);
    expect(latestRef.current?.liveError).toBe(false);
  });

  it("refreshes only when dngm:report-submitted is dispatched", async () => {
    const useReportsStats = await importUseReportsStatsFresh();

    const first: ReportsStatsApiResponse = {
      totalReports: 10,
      mostReportedCompany: { name: "Acme", reportCount: 2 },
    };

    const second: ReportsStatsApiResponse = {
      totalReports: 11,
      mostReportedCompany: { name: "Acme", reportCount: 3 },
    };

    const fetchMock = mockFetchQueue([
      { ok: true, status: 200, json: async () => first },
      { ok: true, status: 200, json: async () => second },
    ]);

    const { latestRef } = await renderHarness(useReportsStats);

    await waitFor(() => latestRef.current?.status === "success", 1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latestRef.current?.stats).toEqual(first);

    act(() => {
      window.dispatchEvent(new Event("dngm:report-submitted"));
    });

    await waitFor(() => fetchMock.mock.calls.length === 2, 1000);
    await waitFor(() => (latestRef.current?.stats?.totalReports ?? 0) === 11, 1000);

    expect(latestRef.current?.stats).toEqual(second);
  });

  it("sets liveError=true when a refresh fails after an initial successful load", async () => {
    const useReportsStats = await importUseReportsStatsFresh();

    const first: ReportsStatsApiResponse = {
      totalReports: 5,
      mostReportedCompany: null,
    };

    const fetchMock = mockFetchQueue([
      { ok: true, status: 200, json: async () => first },
      { ok: false, status: 500, json: async () => ({}) },
    ]);

    const { latestRef } = await renderHarness(useReportsStats);

    await waitFor(() => latestRef.current?.status === "success", 1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latestRef.current?.liveError).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("dngm:report-submitted"));
    });

    await waitFor(() => fetchMock.mock.calls.length === 2, 1000);
    await waitFor(() => latestRef.current?.liveError === true, 1000);

    expect(latestRef.current?.status).toBe("success");
  });

  it("does not start a second refresh while one is already in-flight", async () => {
    const useReportsStats = await importUseReportsStatsFresh();

    const first: ReportsStatsApiResponse = {
      totalReports: 1,
      mostReportedCompany: null,
    };

    const deferred = createDeferred<FetchQueueItem>();

    const fetchMock = vi.fn().mockImplementation(() => {
      const callNo = fetchMock.mock.calls.length;

      if (callNo === 1) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => first,
        });
      }

      if (callNo === 2) {
        return deferred.promise;
      }

      return Promise.reject(new Error("unexpected-fetch-call"));
    });

    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    const { latestRef } = await renderHarness(useReportsStats);

    await waitFor(() => latestRef.current?.status === "success", 1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new Event("dngm:report-submitted"));
      window.dispatchEvent(new Event("dngm:report-submitted"));
      window.dispatchEvent(new Event("dngm:report-submitted"));
    });

    await waitFor(() => fetchMock.mock.calls.length === 2, 1000);

    deferred.resolve({
      ok: true,
      status: 200,
      json: async () =>
        ({
          totalReports: 2,
          mostReportedCompany: null,
        }) satisfies ReportsStatsApiResponse,
    });

    await waitFor(() => (latestRef.current?.stats?.totalReports ?? 0) === 2, 1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sets status=error when initial fetch returns non-OK", async () => {
    const useReportsStats = await importUseReportsStatsFresh();

    const fetchMock = mockFetchQueue([{ ok: false, status: 500, json: async () => ({}) }]);

    const { latestRef } = await renderHarness(useReportsStats);

    await waitFor(() => latestRef.current?.status === "error", 1000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latestRef.current?.stats).toBeNull();
  });

  it("sets status=error when payload shape is invalid (missing mostReportedCompany)", async () => {
    const useReportsStats = await importUseReportsStatsFresh();

    const fetchMock = mockFetchQueue([
      {
        ok: true,
        status: 200,
        json: async () =>
          ({
            totalReports: 1,
          }) satisfies unknown,
      },
    ]);

    const { latestRef } = await renderHarness(useReportsStats);

    await waitFor(() => latestRef.current?.status === "error", 1000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latestRef.current?.stats).toBeNull();
  });

  it("sets status=error when payload shape is invalid (mostReportedCompany invalid object)", async () => {
    const useReportsStats = await importUseReportsStatsFresh();

    const fetchMock = mockFetchQueue([
      {
        ok: true,
        status: 200,
        json: async () =>
          ({
            totalReports: 1,
            mostReportedCompany: { name: 123, reportCount: "nope" },
          }) satisfies unknown,
      },
    ]);

    const { latestRef } = await renderHarness(useReportsStats);

    await waitFor(() => latestRef.current?.status === "error", 1000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latestRef.current?.stats).toBeNull();
  });

  it("keeps the same stats reference when refresh returns identical values and mostReportedCompany is null (statsEqual=true)", async () => {
    const useReportsStats = await importUseReportsStatsFresh();

    const first: ReportsStatsApiResponse = {
      totalReports: 3,
      mostReportedCompany: null,
    };

    const sameValues: ReportsStatsApiResponse = {
      totalReports: 3,
      mostReportedCompany: null,
    };

    const fetchMock = mockFetchQueue([
      { ok: true, status: 200, json: async () => first },
      { ok: true, status: 200, json: async () => sameValues },
    ]);

    const { latestRef } = await renderHarness(useReportsStats);

    await waitFor(() => latestRef.current?.status === "success", 1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const firstRef = latestRef.current?.stats ?? null;

    act(() => {
      window.dispatchEvent(new Event("dngm:report-submitted"));
    });

    await waitFor(() => fetchMock.mock.calls.length === 2, 1000);
    await tick();

    expect(latestRef.current?.stats).toBe(firstRef);
  });

  it("updates stats when mostReportedCompany changes between null and object (statsEqual=false branch)", async () => {
    const useReportsStats = await importUseReportsStatsFresh();

    const first: ReportsStatsApiResponse = {
      totalReports: 7,
      mostReportedCompany: null,
    };

    const second: ReportsStatsApiResponse = {
      totalReports: 7,
      mostReportedCompany: { name: "Acme", reportCount: 1 },
    };

    const fetchMock = mockFetchQueue([
      { ok: true, status: 200, json: async () => first },
      { ok: true, status: 200, json: async () => second },
    ]);

    const { latestRef } = await renderHarness(useReportsStats);

    await waitFor(() => latestRef.current?.status === "success", 1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latestRef.current?.stats).toEqual(first);

    act(() => {
      window.dispatchEvent(new Event("dngm:report-submitted"));
    });

    await waitFor(() => fetchMock.mock.calls.length === 2, 1000);
    await waitFor(() => latestRef.current?.stats?.mostReportedCompany !== null, 1000);

    expect(latestRef.current?.stats).toEqual(second);
  });

  it("refreshNow triggers a refresh (covers refreshNow callback)", async () => {
    const useReportsStats = await importUseReportsStatsFresh();

    const first: ReportsStatsApiResponse = {
      totalReports: 1,
      mostReportedCompany: null,
    };

    const second: ReportsStatsApiResponse = {
      totalReports: 2,
      mostReportedCompany: null,
    };

    const fetchMock = mockFetchQueue([
      { ok: true, status: 200, json: async () => first },
      { ok: true, status: 200, json: async () => second },
    ]);

    const { latestRef } = await renderHarness(useReportsStats);

    await waitFor(() => latestRef.current?.status === "success", 1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await latestRef.current?.refreshNow();
    });

    await waitFor(() => fetchMock.mock.calls.length === 2, 1000);
    await waitFor(() => (latestRef.current?.stats?.totalReports ?? 0) === 2, 1000);
  });

  it("visibilitychange triggers refresh only when document becomes visible", async () => {
    const useReportsStats = await importUseReportsStatsFresh();

    const first: ReportsStatsApiResponse = {
      totalReports: 1,
      mostReportedCompany: null,
    };

    const second: ReportsStatsApiResponse = {
      totalReports: 2,
      mostReportedCompany: null,
    };

    const fetchMock = mockFetchQueue([
      { ok: true, status: 200, json: async () => first },
      { ok: true, status: 200, json: async () => second },
    ]);

    const fetchStartMs = 10_000;
    let nowMs: number = fetchStartMs;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    const { latestRef } = await renderHarness(useReportsStats);

    await waitFor(() => latestRef.current?.status === "success", 1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    setVisibilityState("hidden");
    nowMs = fetchStartMs + 10_000;

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await tick();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    setVisibilityState("visible");
    nowMs = fetchStartMs + 20_000;

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => fetchMock.mock.calls.length === 2, 1000);
  });

  it("uses cachedStats on next mount and treats initial fetch as a refresh (cachedStats branch)", async () => {
    vi.resetModules();
    const mod = await import("@/app/_hooks/useReportsStats");
    const useReportsStats = mod.useReportsStats as unknown as UseReportsStatsHook;

    const first: ReportsStatsApiResponse = {
      totalReports: 9,
      mostReportedCompany: { name: "Acme", reportCount: 1 },
    };

    const second: ReportsStatsApiResponse = {
      totalReports: 10,
      mostReportedCompany: { name: "Acme", reportCount: 2 },
    };

    const deferredSecond = createDeferred<FetchQueueItem>();

    const fetchMock = vi.fn().mockImplementation(() => {
      const callNo = fetchMock.mock.calls.length;

      if (callNo === 1) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => first,
        });
      }

      if (callNo === 2) {
        return deferredSecond.promise;
      }

      return Promise.reject(new Error("unexpected-fetch-call"));
    });

    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    const latest1Ref = { current: null as HookSnapshot | null };

    await act(async () => {
      root = createRoot(container as HTMLDivElement);
      root.render(
        <Harness
          useHook={useReportsStats}
          onUpdate={(s) => {
            latest1Ref.current = s;
          }}
        />,
      );
    });

    await waitFor(() => latest1Ref.current?.status === "success", 1000);
    expect(latest1Ref.current?.stats).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      root?.unmount();
    });
    root = null;

    const latest2Ref = { current: null as HookSnapshot | null };

    await act(async () => {
      root = createRoot(container as HTMLDivElement);
      root.render(
        <Harness
          useHook={useReportsStats}
          onUpdate={(s) => {
            latest2Ref.current = s;
          }}
        />,
      );
    });

    await waitFor(() => latest2Ref.current?.status === "success", 1000);

    expect(latest2Ref.current?.stats).not.toBeNull();

    await waitFor(() => latest2Ref.current?.isRefreshing === true, 1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    deferredSecond.resolve({
      ok: true,
      status: 200,
      json: async () => second,
    });

    await waitFor(
      () =>
        latest2Ref.current !== null &&
        latest2Ref.current.stats?.totalReports === 10 &&
        latest2Ref.current.isRefreshing === false,
      1000,
    );

    expect(latest2Ref.current?.stats).toEqual(second);
  });

  it("aborts an in-flight request on unmount (covers cleanup abort branch)", async () => {
    const useReportsStats = await importUseReportsStatsFresh();

    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal | undefined;

      return new Promise((_resolve, reject) => {
        if (signal === undefined) {
          reject(new Error("missing-signal"));
          return;
        }

        signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    const abortSpy = vi.spyOn(AbortController.prototype, "abort");

    await act(async () => {
      root = createRoot(container as HTMLDivElement);
      root.render(
        <Harness
          useHook={useReportsStats}
          onUpdate={() => {
            // noop
          }}
        />,
      );
    });

    await waitFor(() => fetchMock.mock.calls.length === 1, 750);

    act(() => {
      root?.unmount();
    });

    expect(abortSpy).toHaveBeenCalledTimes(1);
    abortSpy.mockRestore();
  });

  it("does not set status=error on AbortError during initial load (aborted branch)", async () => {
    const useReportsStats = await importUseReportsStatsFresh();

    const fetchMock = vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"));
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    const { latestRef } = await renderHarness(useReportsStats);

    await waitFor(() => latestRef.current !== null, 250);
    await tick();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latestRef.current?.status).toBe("loading");
    expect(latestRef.current?.liveError).toBe(false);
  });
});
