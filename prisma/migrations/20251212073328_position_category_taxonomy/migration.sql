/*
  Custom migration for PositionCategory taxonomy change.

  We:
  - Convert the column to TEXT temporarily.
  - Map legacy enum values to the new taxonomy as plain text.
  - Cast the column to the new enum type.
  - Drop the old enum type.
*/

BEGIN;

ALTER TABLE "Report"
  ALTER COLUMN "positionCategory" DROP DEFAULT;

ALTER TABLE "Report"
  ALTER COLUMN "positionCategory" TYPE TEXT
  USING "positionCategory"::text;

ALTER TYPE "PositionCategory" RENAME TO "PositionCategory_old";

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

ALTER TABLE "Report"
  ALTER COLUMN "positionCategory" TYPE "PositionCategory_new"
  USING "positionCategory"::"PositionCategory_new";

ALTER TYPE "PositionCategory_new" RENAME TO "PositionCategory";

DROP TYPE "PositionCategory_old";

COMMIT;
