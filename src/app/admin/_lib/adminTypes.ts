// src/app/admin/_lib/adminTypes.ts
import type { CountryCode, JobLevel, PositionCategory, ReportStatus, Stage } from "@prisma/client";

/**
 * Minimal shape of a report row rendered in the admin table.
 * Derived from Prisma's Report + Company relation.
 */
export type AdminReportRow = {
  id: string;
  createdAt: Date;
  companyName: string;
  country: CountryCode;
  stage: Stage;
  jobLevel: JobLevel;
  positionCategory: PositionCategory;
  positionDetail: string;
  daysWithoutReply: number | null;
  status: ReportStatus;
  flaggedAt: Date | null;
  flaggedReason: string | null;
  deletedAt: Date | null;
};
