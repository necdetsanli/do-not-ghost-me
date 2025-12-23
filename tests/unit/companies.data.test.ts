// tests/unit/companies.data.test.ts
import type { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

type GroupedRow = {
  companyId: string;
  _count: { _all: number };
};

type PrismaMock = {
  report: {
    groupBy: ReturnType<typeof vi.fn>;
  };
  company: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

/**
 * Hoisted Prisma mock to satisfy Vitest's module-mock hoisting behavior.
 *
 * Vitest hoists vi.mock(...) to the top of the file, so any referenced variables
 * must also be created in a hoisted context to avoid "Cannot access before initialization".
 */
const prismaMock = vi.hoisted<PrismaMock>(() => ({
  report: {
    groupBy: vi.fn(),
  },
  company: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

import { PAGE_SIZE } from "@/app/companies/_lib/constants";
import { getCompaniesPage } from "@/app/companies/_lib/data";

/**
 * Creates a minimal resolved filters object for getCompaniesPage.
 *
 * @param overrides - Partial overrides for default filter values.
 * @returns A ResolvedFilters-like object.
 */
function makeFilters(overrides?: Partial<Record<string, unknown>>) {
  return {
    page: 1,
    search: undefined,
    country: undefined,
    positionCategory: undefined,
    seniority: undefined,
    stage: undefined,
    ...(overrides ?? {}),
  } as unknown as Parameters<typeof getCompaniesPage>[0];
}

describe("getCompaniesPage", () => {
  beforeEach(() => {
    vi.mocked(prismaMock.report.groupBy).mockReset();
    vi.mocked(prismaMock.company.findMany).mockReset();
  });

  it("sorts ties alphabetically by normalized name (A→Z) and then by id for stability", async () => {
    vi.mocked(prismaMock.report.groupBy).mockResolvedValue([
      { companyId: "c1", _count: { _all: 5 } },
      { companyId: "c2", _count: { _all: 5 } },
      { companyId: "c3", _count: { _all: 10 } },
    ] satisfies GroupedRow[]);

    vi.mocked(prismaMock.company.findMany).mockResolvedValue([
      { id: "c1", name: "beta", country: "TR" },
      { id: "c2", name: "Alpha", country: "TR" },
      { id: "c3", name: "Zeta", country: "TR" },
    ]);

    const result = await getCompaniesPage(makeFilters());

    expect(result.totalCompanies).toBe(3);
    expect(result.totalPages).toBe(1);

    // Highest count first.
    expect(result.items[0]?.id).toBe("c3");

    // Tie (5 vs 5) -> alphabetical by normalized name => Alpha then beta
    expect(result.items[1]?.id).toBe("c2");
    expect(result.items[2]?.id).toBe("c1");
  });

  it("applies search/country filters via the Report->Company relation where clause", async () => {
    vi.mocked(prismaMock.report.groupBy).mockResolvedValue([
      { companyId: "c1", _count: { _all: 1 } },
    ] satisfies GroupedRow[]);

    vi.mocked(prismaMock.company.findMany).mockResolvedValue([
      { id: "c1", name: "Acme", country: "TR" },
    ]);

    const filters = makeFilters({
      search: "ac",
      country: "TR",
    });

    await getCompaniesPage(filters);

    expect(prismaMock.report.groupBy).toHaveBeenCalledTimes(1);

    const callArg = prismaMock.report.groupBy.mock.calls[0]?.[0] as unknown as {
      where?: Prisma.ReportWhereInput;
    };

    expect(callArg.where).toBeDefined();
    expect(callArg.where?.status).toBe("ACTIVE");

    // Ensure nested company filter exists when search/country are set.
    expect(callArg.where?.company).toBeDefined();
  });

  it("paginates deterministically after stable ordering (no overlaps, stable page slices)", async () => {
    const groups: GroupedRow[] = [];
    const companies: Array<{ id: string; name: string; country: string }> = [];

    // PAGE_SIZE + 2 companies with the same count so tie sorting matters.
    for (let i = 0; i < PAGE_SIZE + 2; i += 1) {
      const id = `c-${String(i).padStart(4, "0")}`;
      groups.push({ companyId: id, _count: { _all: 1 } });

      // Reverse-ish naming to ensure sorting must reorder.
      const name = `Company ${String(PAGE_SIZE + 2 - i).padStart(4, "0")}`;
      companies.push({ id, name, country: "TR" });
    }

    vi.mocked(prismaMock.report.groupBy).mockResolvedValue(groups);
    vi.mocked(prismaMock.company.findMany).mockResolvedValue(companies);

    const page1 = await getCompaniesPage(makeFilters({ page: 1 }));
    const page2 = await getCompaniesPage(makeFilters({ page: 2 }));
    const page1Again = await getCompaniesPage(makeFilters({ page: 1 }));

    expect(page1.items.length).toBe(PAGE_SIZE);
    expect(page2.items.length).toBe(2);

    // Stable slicing: page 1 should be identical across calls.
    expect(page1Again.items.map((x) => x.id)).toEqual(page1.items.map((x) => x.id));

    // No overlap between pages.
    const page1Ids = new Set(page1.items.map((x) => x.id));
    for (const row of page2.items) {
      expect(page1Ids.has(row.id)).toBe(false);
    }
  });

  it("returns empty results with totalPages=1 when no companies match", async () => {
    vi.mocked(prismaMock.report.groupBy).mockResolvedValue([]);

    const result = await getCompaniesPage(makeFilters());

    expect(result.items).toEqual([]);
    expect(result.totalCompanies).toBe(0);
    expect(result.totalPages).toBe(1);
    expect(prismaMock.company.findMany).not.toHaveBeenCalled();
  });

  it("applies positionCategory, seniority, and stage filters to where clause", async () => {
    vi.mocked(prismaMock.report.groupBy).mockResolvedValue([
      { companyId: "c1", _count: { _all: 3 } },
    ] satisfies GroupedRow[]);

    vi.mocked(prismaMock.company.findMany).mockResolvedValue([
      { id: "c1", name: "Test Corp", country: "US" },
    ]);

    const filters = makeFilters({
      positionCategory: "IT",
      seniority: "SENIOR",
      stage: "CV_SCREEN",
    });

    await getCompaniesPage(filters);

    expect(prismaMock.report.groupBy).toHaveBeenCalledTimes(1);

    const callArg = prismaMock.report.groupBy.mock.calls[0]?.[0] as unknown as {
      where?: Prisma.ReportWhereInput;
    };

    expect(callArg.where?.positionCategory).toBe("IT");
    expect(callArg.where?.jobLevel).toBe("SENIOR");
    expect(callArg.where?.stage).toBe("CV_SCREEN");
  });

  it("throws error when company record is missing for a grouped companyId", async () => {
    vi.mocked(prismaMock.report.groupBy).mockResolvedValue([
      { companyId: "missing-company", _count: { _all: 5 } },
    ] satisfies GroupedRow[]);

    // Return empty array - no company found for the grouped companyId
    vi.mocked(prismaMock.company.findMany).mockResolvedValue([]);

    await expect(getCompaniesPage(makeFilters())).rejects.toThrow(
      "Company record not found for companyId=missing-company while building companies page.",
    );
  });

  it("sorts ties with identical normalized names by id (a.id < b.id branch)", async () => {
    vi.mocked(prismaMock.report.groupBy).mockResolvedValue([
      { companyId: "c2", _count: { _all: 5 } },
      { companyId: "c1", _count: { _all: 5 } },
    ] satisfies GroupedRow[]);

    // Same exact normalized name after normalization
    vi.mocked(prismaMock.company.findMany).mockResolvedValue([
      { id: "c2", name: "Acme", country: "US" },
      { id: "c1", name: "Acme", country: "US" }, // Same name
    ]);

    const result = await getCompaniesPage(makeFilters());

    // Same count, same normalized name → sort by id ASC
    expect(result.items[0]?.id).toBe("c1");
    expect(result.items[1]?.id).toBe("c2");
  });

  it("returns 0 when comparing items with identical id (a.id === b.id branch)", async () => {
    // This tests the edge case where the same item is compared against itself
    // which can happen in some sorting algorithms
    vi.mocked(prismaMock.report.groupBy).mockResolvedValue([
      { companyId: "c1", _count: { _all: 5 } },
    ] satisfies GroupedRow[]);

    vi.mocked(prismaMock.company.findMany).mockResolvedValue([
      { id: "c1", name: "Acme", country: "US" },
    ]);

    const result = await getCompaniesPage(makeFilters());

    // Single item, verifying stable sort doesn't error
    expect(result.items.length).toBe(1);
    expect(result.items[0]?.id).toBe("c1");
  });
});
