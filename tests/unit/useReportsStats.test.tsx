// tests/unit/useReportsStats.test.tsx
/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch globally
const fetchMock = vi.fn();

/**
 * Creates a mock Response object for fetch.
 *
 * @param data - JSON data to return.
 * @param ok - Whether the response is successful.
 * @param status - HTTP status code.
 * @returns A mock Response.
 */
function mockResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

// Store dynamically imported module
let useReportsStats: () => {
  stats: {
    totalReports: number;
    mostReportedCompany: { name: string; reportCount: number } | null;
  } | null;
  status: "idle" | "loading" | "success" | "error";
  isRefreshing: boolean;
  liveError: boolean;
  refreshNow: () => Promise<void>;
};

// Event name constant (not exported from the module)
const REPORT_SUBMITTED_EVENT_NAME = "dngm:report-submitted";

describe("useReportsStats", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules(); // Reset module cache to clear cachedStats
    global.fetch = fetchMock;

    // Dynamically import the module to get a fresh copy with reset cachedStats
    const hookModule = await import("@/app/_hooks/useReportsStats");
    useReportsStats = hookModule.useReportsStats;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches stats on mount and returns success status", async () => {
    const statsData = {
      totalReports: 42,
      mostReportedCompany: { name: "Acme Corp", reportCount: 10 },
    };

    fetchMock.mockResolvedValue(mockResponse(statsData));

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    expect(result.current.stats).toEqual(statsData);
    expect(result.current.liveError).toBe(false);
  });

  it("sets error status when initial fetch fails with non-ok response", async () => {
    fetchMock.mockResolvedValue(mockResponse({}, false, 500));

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
  });

  it("sets error status when response shape is invalid (missing totalReports)", async () => {
    fetchMock.mockResolvedValue(mockResponse({ invalid: "data" }));

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
  });

  it("sets error status when totalReports is not a number", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ totalReports: "not-a-number", mostReportedCompany: null }),
    );

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
  });

  it("sets error status when mostReportedCompany is undefined", async () => {
    fetchMock.mockResolvedValue(mockResponse({ totalReports: 42 }));

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
  });

  it("sets error status when mostReportedCompany has invalid shape", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        totalReports: 42,
        mostReportedCompany: { name: 123, reportCount: "invalid" },
      }),
    );

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
  });

  it("accepts null mostReportedCompany as valid", async () => {
    const statsData = {
      totalReports: 0,
      mostReportedCompany: null,
    };

    fetchMock.mockResolvedValue(mockResponse(statsData));

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    expect(result.current.stats?.mostReportedCompany).toBe(null);
  });

  it("sets liveError when refresh fails after successful initial load", async () => {
    const statsData = {
      totalReports: 42,
      mostReportedCompany: null,
    };

    fetchMock.mockResolvedValueOnce(mockResponse(statsData));

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    // Second fetch fails
    fetchMock.mockResolvedValueOnce(mockResponse({}, false, 500));

    await act(async () => {
      await result.current.refreshNow();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.liveError).toBe(true);
  });

  it("does not update stats if they are equal to previous", async () => {
    const statsData = {
      totalReports: 42,
      mostReportedCompany: { name: "Acme Corp", reportCount: 10 },
    };

    fetchMock.mockResolvedValue(mockResponse(statsData));

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    const firstStats = result.current.stats;

    await act(async () => {
      await result.current.refreshNow();
    });

    // Stats object should be the same reference (not updated)
    expect(result.current.stats).toBe(firstStats);
  });

  it("updates stats when totalReports changes", async () => {
    const statsData1 = {
      totalReports: 42,
      mostReportedCompany: null,
    };

    const statsData2 = {
      totalReports: 43,
      mostReportedCompany: null,
    };

    fetchMock.mockResolvedValueOnce(mockResponse(statsData1));

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.stats?.totalReports).toBe(42);
    });

    fetchMock.mockResolvedValueOnce(mockResponse(statsData2));

    await act(async () => {
      await result.current.refreshNow();
    });

    expect(result.current.stats?.totalReports).toBe(43);
  });

  it("updates stats when mostReportedCompany changes from null to value", async () => {
    const statsData1 = {
      totalReports: 42,
      mostReportedCompany: null,
    };

    const statsData2 = {
      totalReports: 42,
      mostReportedCompany: { name: "New Corp", reportCount: 5 },
    };

    fetchMock.mockResolvedValueOnce(mockResponse(statsData1));

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.stats?.mostReportedCompany).toBe(null);
    });

    fetchMock.mockResolvedValueOnce(mockResponse(statsData2));

    await act(async () => {
      await result.current.refreshNow();
    });

    expect(result.current.stats?.mostReportedCompany?.name).toBe("New Corp");
  });

  it("updates stats when mostReportedCompany changes from value to null", async () => {
    const statsData1 = {
      totalReports: 42,
      mostReportedCompany: { name: "Acme", reportCount: 10 },
    };

    const statsData2 = {
      totalReports: 42,
      mostReportedCompany: null,
    };

    fetchMock.mockResolvedValueOnce(mockResponse(statsData1));

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.stats?.mostReportedCompany?.name).toBe("Acme");
    });

    fetchMock.mockResolvedValueOnce(mockResponse(statsData2));

    await act(async () => {
      await result.current.refreshNow();
    });

    expect(result.current.stats?.mostReportedCompany).toBe(null);
  });

  it("refreshes when REPORT_SUBMITTED_EVENT is dispatched", async () => {
    const statsData = {
      totalReports: 42,
      mostReportedCompany: null,
    };

    fetchMock.mockResolvedValue(mockResponse(statsData));

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    const initialCallCount = fetchMock.mock.calls.length;

    await act(async () => {
      window.dispatchEvent(new CustomEvent(REPORT_SUBMITTED_EVENT_NAME));
      // Wait a bit for the event handler to process
      await new Promise((r) => setTimeout(r, 50));
    });

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  it("cleans up event listeners on unmount", async () => {
    const statsData = {
      totalReports: 42,
      mostReportedCompany: null,
    };

    fetchMock.mockResolvedValue(mockResponse(statsData));

    const { result, unmount } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    const callCountBeforeUnmount = fetchMock.mock.calls.length;

    unmount();

    // Dispatch event after unmount - should not trigger fetch
    window.dispatchEvent(new CustomEvent(REPORT_SUBMITTED_EVENT_NAME));

    // Wait a bit
    await new Promise((r) => setTimeout(r, 50));

    // Should not have called fetch again
    expect(fetchMock.mock.calls.length).toBe(callCountBeforeUnmount);
  });

  it("handles fetch network error gracefully", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
  });

  it("sets isRefreshing during refresh", async () => {
    const statsData = {
      totalReports: 42,
      mostReportedCompany: null,
    };

    fetchMock.mockResolvedValueOnce(mockResponse(statsData));

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    // Slow refresh
    let resolveRefresh: (value: Response) => void;
    const slowPromise = new Promise<Response>((r) => {
      resolveRefresh = r;
    });
    fetchMock.mockReturnValueOnce(slowPromise);

    act(() => {
      void result.current.refreshNow();
    });

    expect(result.current.isRefreshing).toBe(true);

    await act(async () => {
      resolveRefresh!(mockResponse(statsData));
    });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  it("validates mostReportedCompany object with correct types", async () => {
    // Valid: both name is string and reportCount is number
    const validStats = {
      totalReports: 10,
      mostReportedCompany: { name: "Test", reportCount: 5 },
    };

    fetchMock.mockResolvedValue(mockResponse(validStats));

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });
  });

  it("rejects mostReportedCompany when name is not a string", async () => {
    const invalidStats = {
      totalReports: 10,
      mostReportedCompany: { name: null, reportCount: 5 },
    };

    fetchMock.mockResolvedValue(mockResponse(invalidStats));

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
  });

  it("rejects mostReportedCompany when reportCount is not a number", async () => {
    const invalidStats = {
      totalReports: 10,
      mostReportedCompany: { name: "Test", reportCount: "five" },
    };

    fetchMock.mockResolvedValue(mockResponse(invalidStats));

    const { result } = renderHook(() => useReportsStats());

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
  });
});
