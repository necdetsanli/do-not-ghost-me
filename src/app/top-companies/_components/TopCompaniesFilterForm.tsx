// src/app/top-companies/_components/TopCompaniesFilterForm.tsx
import type { JSX } from "react";
import {
  POSITION_CATEGORY_OPTIONS,
  JOB_LEVEL_OPTIONS,
  STAGE_OPTIONS,
  labelForCategory,
  labelForJobLevel,
  labelForStage,
  categoryEnumToSlug,
  seniorityEnumToSlug,
  stageEnumToSlug,
} from "@/lib/enums";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { CountrySelect } from "@/components/CountrySelect";
import type { TopCompaniesFilterFormProps } from "../types";

/**
 * Filter/search form at the top of the "Top companies" page.
 * Uses a GET form so filters are reflected in the URL.
 */
export function TopCompaniesFilterForm(
  props: TopCompaniesFilterFormProps,
): JSX.Element {
  const { filters } = props;
  const { search, country, positionCategory, seniority, stage } = filters;

  return (
    <section className="mt-4 mb-6 rounded-xl border border-primary bg-surface px-4 py-4 shadow-sm md:px-5 md:py-5">
      <form
        method="GET"
        className="grid items-end gap-4 md:grid-cols-2 lg:grid-cols-5"
        aria-label="Filter ghosting companies"
      >
        {/* Company name search */}
        <Input
          label="Search by company name"
          name="search"
          defaultValue={search ?? ""}
          placeholder="e.g. TechCorp"
        />

        {/* Country filter (CountryCode enum via combobox) */}
        <CountrySelect name="country" label="Country" initialCode={country} />

        {/* Position category filter (slug-based) */}
        <Select
          label="Position category"
          name="category"
          defaultValue={
            positionCategory !== undefined
              ? categoryEnumToSlug(positionCategory)
              : ""
          }
          options={[
            { value: "", label: "All categories" },
            ...POSITION_CATEGORY_OPTIONS.map((cat) => ({
              value: categoryEnumToSlug(cat),
              label: labelForCategory(cat),
            })),
          ]}
        />

        {/* Stage filter */}
        <Select
          label="Stage"
          name="stage"
          defaultValue={stage !== undefined ? stageEnumToSlug(stage) : ""}
          options={[
            { value: "", label: "All stages" },
            ...STAGE_OPTIONS.map((st) => ({
              value: stageEnumToSlug(st),
              label: labelForStage(st),
            })),
          ]}
        />

        {/* Seniority filter (JobLevel) */}
        <Select
          label="Seniority"
          name="seniority"
          defaultValue={
            seniority !== undefined ? seniorityEnumToSlug(seniority) : ""
          }
          options={[
            { value: "", label: "All seniorities" },
            ...JOB_LEVEL_OPTIONS.map((lvl) => ({
              value: seniorityEnumToSlug(lvl),
              label: labelForJobLevel(lvl),
            })),
          ]}
        />

        {/* Submit button */}
        <div className="flex justify-end md:col-span-2 lg:col-span-5">
          <Button type="submit" size="md">
            Apply filters
          </Button>
        </div>
      </form>
    </section>
  );
}
