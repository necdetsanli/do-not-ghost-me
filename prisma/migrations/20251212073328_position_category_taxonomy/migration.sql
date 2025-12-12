/*
  Custom migration for PositionCategory taxonomy change.

  Steps:

  1. Drop DEFAULT on Report.positionCategory (it may reference the old enum type).
  2. Cast the column to TEXT so we can freely remap string values.
  3. Rename the old enum type to PositionCategory_old.
  4. Create the new PositionCategory enum with the *final* set of labels.
  5. UPDATE existing rows to map legacy technical categories to "IT".
  6. Cast the TEXT column back to the new enum type.
  7. Rename PositionCategory_new -> PositionCategory and drop the old type.

  All of this happens inside a single transaction. If anything fails,
  the transaction is rolled back and the schema/data remain unchanged.
*/

BEGIN;

-- 1) Drop any default that might depend on the old enum type.
ALTER TABLE "Report"
  ALTER COLUMN "positionCategory" DROP DEFAULT;

-- 2) Convert enum column to TEXT so we can rewrite values.
ALTER TABLE "Report"
  ALTER COLUMN "positionCategory" TYPE TEXT
  USING "positionCategory"::text;

-- 3) Rename the old enum type so we can create the new one.
ALTER TYPE "PositionCategory" RENAME TO "PositionCategory_old";

-- 4) Create the new enum type.
--    IMPORTANT: This list must match prisma/schema.prisma.
CREATE TYPE "PositionCategory_new" AS ENUM (
  'IT',
  'ENGINEERING',
  'FINANCE_ACCOUNTING',
  'AUDIT_ADVISORY',
  'CONSULTING',
  'HR',
  'SALES_MARKETING',
  'RESEARCH_DEVELOPMENT',
  'DESIGN',
  'PRODUCT',
  'OPERATIONS',
  'PROJECT_PROGRAM',
  'ADMINISTRATION',
  'LEGAL_COMPLIANCE',
  'CUSTOMER_SUPPORT',
  'EDUCATION_TRAINING',
  'HEALTHCARE_LIFE_SCIENCES',
  'SUPPLY_CHAIN_LOGISTICS',
  'OTHER'
);

-- 5) Map legacy values -> new taxonomy as plain TEXT.
--    All known old technical categories collapse into IT.
UPDATE "Report"
SET "positionCategory" = CASE "positionCategory"
  WHEN 'SOFTWARE_ENGINEERING'      THEN 'IT'
  WHEN 'DEVOPS_SRE_PLATFORM'       THEN 'IT'
  WHEN 'SECURITY'                  THEN 'IT'
  WHEN 'DATA_ML_AI'                THEN 'IT'
  WHEN 'MOBILE'                    THEN 'IT'
  WHEN 'EMBEDDED_ROBOTICS'         THEN 'IT'
  WHEN 'QA_TEST'                   THEN 'IT'
  WHEN 'CLOUD_INFRA'               THEN 'IT'
  ELSE "positionCategory"
END;

-- 6) Cast the TEXT column back to the new enum.
--    At this point every value should be one of the new enum labels.
ALTER TABLE "Report"
  ALTER COLUMN "positionCategory" TYPE "PositionCategory_new"
  USING "positionCategory"::"PositionCategory_new";

-- (Optional) If your Prisma schema has @default(OTHER) on this field,
-- you may want to restore the default here:
-- ALTER TABLE "Report"
--   ALTER COLUMN "positionCategory" SET DEFAULT 'OTHER';

-- 7) Swap types: PositionCategory_new becomes PositionCategory.
ALTER TYPE "PositionCategory_new" RENAME TO "PositionCategory";

-- 8) Drop the old enum type now that nothing references it.
DROP TYPE "PositionCategory_old";

COMMIT;
