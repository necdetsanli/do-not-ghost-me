//src/lib/enums.ts
// Shared enum helpers for labels and URL slugs.
import { PositionCategory, JobLevel, Stage, CountryCode } from "@prisma/client";

/**
 * Converts an enum value (e.g. "DEVOPS_SRE_PLATFORM") to a URL-safe slug
 * (e.g. "devops-sre-platform").
 *
 * @param value - The raw enum string value.
 * @returns A lowercase, hyphen-separated slug.
 */
export function enumToSlug(value: string): string {
  return value.toLowerCase().replace(/_/g, "-");
}

/**
 * Converts an enum value (e.g. "DEVOPS_SRE_PLATFORM") to a human-readable label
 * (e.g. "Devops Sre Platform").
 *
 * Note: For nicer labels, this is typically overridden by custom maps below.
 *
 * @param value - The raw enum string value.
 * @returns A simple title-cased label derived from the enum name.
 */
export function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Base enum value arrays
// ---------------------------------------------------------------------------

export const POSITION_CATEGORY_OPTIONS = Object.values(
  PositionCategory,
) as readonly PositionCategory[];

export const JOB_LEVEL_OPTIONS = Object.values(JobLevel) as readonly JobLevel[];
export const STAGE_OPTIONS = Object.values(Stage) as readonly Stage[];
export const COUNTRY_OPTIONS = Object.values(
  CountryCode,
) as readonly CountryCode[];

// ---------------------------------------------------------------------------
// Custom labels (override maps)
// ---------------------------------------------------------------------------

const POSITION_CATEGORY_LABELS: Partial<Record<PositionCategory, string>> = {
  [PositionCategory.DEVOPS_SRE_PLATFORM]: "DevOps/SRE/Platform",
  [PositionCategory.SOFTWARE_ENGINEERING]: "Software Engineering",
  [PositionCategory.CLOUD_INFRA]: "Cloud/Infrastructure",
  [PositionCategory.DATA_ML_AI]: "Data/ML/AI",
  [PositionCategory.DESIGN]: "Design",
  [PositionCategory.EMBEDDED_ROBOTICS]: "Embedded/Robotics/IoT",
  [PositionCategory.MOBILE]: "Mobile",
  [PositionCategory.OTHER]: "Other",
  [PositionCategory.PRODUCT]: "Product",
  [PositionCategory.QA_TEST]: "QA/Test",
  [PositionCategory.SECURITY]: "Security",
};

const JOB_LEVEL_LABELS: Partial<Record<JobLevel, string>> = {
  [JobLevel.INTERN]: "Intern",
  [JobLevel.JUNIOR]: "Junior",
  [JobLevel.MID]: "Mid-Level",
  [JobLevel.SENIOR]: "Senior",
  [JobLevel.LEAD]: "Lead",
  [JobLevel.OTHER]: "Other",
};

const STAGE_LABELS: Partial<Record<Stage, string>> = {
  [Stage.CV_SCREEN]: "CV Screening",
  [Stage.FIRST_INTERVIEW]: "First Interview",
  [Stage.TECHNICAL]: "Technical Interview",
  [Stage.HR_INTERVIEW]: "HR Interview",
  [Stage.OFFER]: "Offer",
  [Stage.OTHER]: "Other",
};

const COUNTRY_LABELS: Partial<Record<CountryCode, string>> = {
  // ... same mapping as şu anki halin (değiştirmedim; sadece kısalttım burada)
  [CountryCode.AD]: "Andorra",
  [CountryCode.AE]: "United Arab Emirates",
  [CountryCode.AF]: "Afghanistan",
  [CountryCode.AG]: "Antigua and Barbuda",
  [CountryCode.AI]: "Anguilla",
  [CountryCode.AL]: "Albania",
  [CountryCode.AM]: "Armenia",
  [CountryCode.AO]: "Angola",
  [CountryCode.AQ]: "Antarctica",
  [CountryCode.AR]: "Argentina",
  [CountryCode.AS]: "American Samoa",
  [CountryCode.AT]: "Austria",
  [CountryCode.AU]: "Australia",
  [CountryCode.AW]: "Aruba",
  [CountryCode.AX]: "Åland Islands",
  [CountryCode.AZ]: "Azerbaijan",
  [CountryCode.BA]: "Bosnia and Herzegovina",
  [CountryCode.BB]: "Barbados",
  [CountryCode.BD]: "Bangladesh",
  [CountryCode.BE]: "Belgium",
  [CountryCode.BF]: "Burkina Faso",
  [CountryCode.BG]: "Bulgaria",
  [CountryCode.BH]: "Bahrain",
  [CountryCode.BI]: "Burundi",
  [CountryCode.BJ]: "Benin",
  [CountryCode.BL]: "Saint Barthélemy",
  [CountryCode.BM]: "Bermuda",
  [CountryCode.BN]: "Brunei",
  [CountryCode.BO]: "Bolivia",
  [CountryCode.BQ]: "Caribbean Netherlands",
  [CountryCode.BR]: "Brazil",
  [CountryCode.BS]: "Bahamas",
  [CountryCode.BT]: "Bhutan",
  [CountryCode.BV]: "Bouvet Island",
  [CountryCode.BW]: "Botswana",
  [CountryCode.BY]: "Belarus",
  [CountryCode.BZ]: "Belize",
  [CountryCode.CA]: "Canada",
  [CountryCode.CC]: "Cocos (Keeling) Islands",
  [CountryCode.CD]: "Congo (DRC)",
  [CountryCode.CF]: "Central African Republic",
  [CountryCode.CG]: "Congo (Republic)",
  [CountryCode.CH]: "Switzerland",
  [CountryCode.CI]: "Côte d'Ivoire",
  [CountryCode.CK]: "Cook Islands",
  [CountryCode.CL]: "Chile",
  [CountryCode.CM]: "Cameroon",
  [CountryCode.CN]: "China",
  [CountryCode.CO]: "Colombia",
  [CountryCode.CR]: "Costa Rica",
  [CountryCode.CU]: "Cuba",
  [CountryCode.CV]: "Cape Verde",
  [CountryCode.CW]: "Curaçao",
  [CountryCode.CX]: "Christmas Island",
  [CountryCode.CY]: "Cyprus",
  [CountryCode.CZ]: "Czech Republic",
  [CountryCode.DE]: "Germany",
  [CountryCode.DJ]: "Djibouti",
  [CountryCode.DK]: "Denmark",
  [CountryCode.DM]: "Dominica",
  [CountryCode.DO]: "Dominican Republic",
  [CountryCode.DZ]: "Algeria",
  [CountryCode.EC]: "Ecuador",
  [CountryCode.EE]: "Estonia",
  [CountryCode.EG]: "Egypt",
  [CountryCode.EH]: "Western Sahara",
  [CountryCode.ER]: "Eritrea",
  [CountryCode.ES]: "Spain",
  [CountryCode.ET]: "Ethiopia",
  [CountryCode.FI]: "Finland",
  [CountryCode.FJ]: "Fiji",
  [CountryCode.FK]: "Falkland Islands",
  [CountryCode.FM]: "Micronesia",
  [CountryCode.FO]: "Faroe Islands",
  [CountryCode.FR]: "France",
  [CountryCode.GA]: "Gabon",
  [CountryCode.GB]: "United Kingdom",
  [CountryCode.GD]: "Grenada",
  [CountryCode.GE]: "Georgia",
  [CountryCode.GF]: "French Guiana",
  [CountryCode.GG]: "Guernsey",
  [CountryCode.GH]: "Ghana",
  [CountryCode.GI]: "Gibraltar",
  [CountryCode.GL]: "Greenland",
  [CountryCode.GM]: "Gambia",
  [CountryCode.GN]: "Guinea",
  [CountryCode.GP]: "Guadeloupe",
  [CountryCode.GQ]: "Equatorial Guinea",
  [CountryCode.GR]: "Greece",
  [CountryCode.GS]: "South Georgia and the South Sandwich Islands",
  [CountryCode.GT]: "Guatemala",
  [CountryCode.GU]: "Guam",
  [CountryCode.GW]: "Guinea-Bissau",
  [CountryCode.GY]: "Guyana",
  [CountryCode.HK]: "Hong Kong",
  [CountryCode.HM]: "Heard Island and McDonald Islands",
  [CountryCode.HN]: "Honduras",
  [CountryCode.HR]: "Croatia",
  [CountryCode.HT]: "Haiti",
  [CountryCode.HU]: "Hungary",
  [CountryCode.ID]: "Indonesia",
  [CountryCode.IE]: "Ireland",
  [CountryCode.IL]: "Israel",
  [CountryCode.IM]: "Isle of Man",
  [CountryCode.IN]: "India",
  [CountryCode.IO]: "British Indian Ocean Territory",
  [CountryCode.IQ]: "Iraq",
  [CountryCode.IR]: "Iran",
  [CountryCode.IS]: "Iceland",
  [CountryCode.IT]: "Italy",
  [CountryCode.JE]: "Jersey",
  [CountryCode.JM]: "Jamaica",
  [CountryCode.JO]: "Jordan",
  [CountryCode.JP]: "Japan",
  [CountryCode.KE]: "Kenya",
  [CountryCode.KG]: "Kyrgyzstan",
  [CountryCode.KH]: "Cambodia",
  [CountryCode.KI]: "Kiribati",
  [CountryCode.KM]: "Comoros",
  [CountryCode.KN]: "Saint Kitts and Nevis",
  [CountryCode.KP]: "North Korea",
  [CountryCode.KR]: "South Korea",
  [CountryCode.KW]: "Kuwait",
  [CountryCode.KY]: "Cayman Islands",
  [CountryCode.KZ]: "Kazakhstan",
  [CountryCode.LA]: "Laos",
  [CountryCode.LB]: "Lebanon",
  [CountryCode.LC]: "Saint Lucia",
  [CountryCode.LI]: "Liechtenstein",
  [CountryCode.LK]: "Sri Lanka",
  [CountryCode.LR]: "Liberia",
  [CountryCode.LS]: "Lesotho",
  [CountryCode.LT]: "Lithuania",
  [CountryCode.LU]: "Luxembourg",
  [CountryCode.LV]: "Latvia",
  [CountryCode.LY]: "Libya",
  [CountryCode.MA]: "Morocco",
  [CountryCode.MC]: "Monaco",
  [CountryCode.MD]: "Moldova",
  [CountryCode.ME]: "Montenegro",
  [CountryCode.MF]: "Saint Martin",
  [CountryCode.MG]: "Madagascar",
  [CountryCode.MH]: "Marshall Islands",
  [CountryCode.MK]: "North Macedonia",
  [CountryCode.ML]: "Mali",
  [CountryCode.MM]: "Myanmar",
  [CountryCode.MN]: "Mongolia",
  [CountryCode.MO]: "Macao",
  [CountryCode.MP]: "Northern Mariana Islands",
  [CountryCode.MQ]: "Martinique",
  [CountryCode.MR]: "Mauritania",
  [CountryCode.MS]: "Montserrat",
  [CountryCode.MT]: "Malta",
  [CountryCode.MU]: "Mauritius",
  [CountryCode.MV]: "Maldives",
  [CountryCode.MW]: "Malawi",
  [CountryCode.MX]: "Mexico",
  [CountryCode.MY]: "Malaysia",
  [CountryCode.MZ]: "Mozambique",
  [CountryCode.NA]: "Namibia",
  [CountryCode.NC]: "New Caledonia",
  [CountryCode.NE]: "Niger",
  [CountryCode.NF]: "Norfolk Island",
  [CountryCode.NG]: "Nigeria",
  [CountryCode.NI]: "Nicaragua",
  [CountryCode.NL]: "Netherlands",
  [CountryCode.NO]: "Norway",
  [CountryCode.NP]: "Nepal",
  [CountryCode.NR]: "Nauru",
  [CountryCode.NU]: "Niue",
  [CountryCode.NZ]: "New Zealand",
  [CountryCode.OM]: "Oman",
  [CountryCode.PA]: "Panama",
  [CountryCode.PE]: "Peru",
  [CountryCode.PF]: "French Polynesia",
  [CountryCode.PG]: "Papua New Guinea",
  [CountryCode.PH]: "Philippines",
  [CountryCode.PK]: "Pakistan",
  [CountryCode.PL]: "Poland",
  [CountryCode.PM]: "Saint Pierre and Miquelon",
  [CountryCode.PN]: "Pitcairn Islands",
  [CountryCode.PR]: "Puerto Rico",
  [CountryCode.PS]: "Palestine",
  [CountryCode.PT]: "Portugal",
  [CountryCode.PW]: "Palau",
  [CountryCode.PY]: "Paraguay",
  [CountryCode.QA]: "Qatar",
  [CountryCode.RE]: "Réunion",
  [CountryCode.RO]: "Romania",
  [CountryCode.RS]: "Serbia",
  [CountryCode.RU]: "Russia",
  [CountryCode.RW]: "Rwanda",
  [CountryCode.SA]: "Saudi Arabia",
  [CountryCode.SB]: "Solomon Islands",
  [CountryCode.SC]: "Seychelles",
  [CountryCode.SD]: "Sudan",
  [CountryCode.SE]: "Sweden",
  [CountryCode.SG]: "Singapore",
  [CountryCode.SH]: "Saint Helena",
  [CountryCode.SI]: "Slovenia",
  [CountryCode.SJ]: "Svalbard and Jan Mayen",
  [CountryCode.SK]: "Slovakia",
  [CountryCode.SL]: "Sierra Leone",
  [CountryCode.SM]: "San Marino",
  [CountryCode.SN]: "Senegal",
  [CountryCode.SO]: "Somalia",
  [CountryCode.SR]: "Suriname",
  [CountryCode.SS]: "South Sudan",
  [CountryCode.ST]: "São Tomé and Príncipe",
  [CountryCode.SV]: "El Salvador",
  [CountryCode.SX]: "Sint Maarten",
  [CountryCode.SY]: "Syria",
  [CountryCode.SZ]: "Eswatini",
  [CountryCode.TC]: "Turks and Caicos Islands",
  [CountryCode.TD]: "Chad",
  [CountryCode.TF]: "French Southern Territories",
  [CountryCode.TG]: "Togo",
  [CountryCode.TH]: "Thailand",
  [CountryCode.TJ]: "Tajikistan",
  [CountryCode.TK]: "Tokelau",
  [CountryCode.TL]: "Timor-Leste",
  [CountryCode.TM]: "Turkmenistan",
  [CountryCode.TN]: "Tunisia",
  [CountryCode.TO]: "Tonga",
  [CountryCode.TR]: "Turkey",
  [CountryCode.TT]: "Trinidad and Tobago",
  [CountryCode.TV]: "Tuvalu",
  [CountryCode.TW]: "Taiwan",
  [CountryCode.TZ]: "Tanzania",
  [CountryCode.UA]: "Ukraine",
  [CountryCode.UG]: "Uganda",
  [CountryCode.UM]: "U.S. Minor Outlying Islands",
  [CountryCode.US]: "United States",
  [CountryCode.UY]: "Uruguay",
  [CountryCode.UZ]: "Uzbekistan",
  [CountryCode.VA]: "Vatican City",
  [CountryCode.VC]: "Saint Vincent and the Grenadines",
  [CountryCode.VE]: "Venezuela",
  [CountryCode.VG]: "British Virgin Islands",
  [CountryCode.VI]: "U.S. Virgin Islands",
  [CountryCode.VN]: "Vietnam",
  [CountryCode.VU]: "Vanuatu",
  [CountryCode.WF]: "Wallis and Futuna",
  [CountryCode.WS]: "Samoa",
  [CountryCode.YE]: "Yemen",
  [CountryCode.YT]: "Mayotte",
  [CountryCode.ZA]: "South Africa",
  [CountryCode.ZM]: "Zambia",
  [CountryCode.ZW]: "Zimbabwe",
};

// ---------------------------------------------------------------------------
// Public label helpers
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable label for a given PositionCategory.
 * Falls back to a generic formatter if not explicitly mapped.
 *
 * @param cat - The PositionCategory enum value.
 * @returns A human-readable label for the category.
 */
export function labelForCategory(cat: PositionCategory): string {
  return POSITION_CATEGORY_LABELS[cat] ?? formatEnumLabel(cat);
}

/**
 * Returns a human-readable label for a given JobLevel.
 * Falls back to a generic formatter if not explicitly mapped.
 *
 * @param level - The JobLevel enum value.
 * @returns A human-readable label for the job level.
 */
export function labelForJobLevel(level: JobLevel): string {
  return JOB_LEVEL_LABELS[level] ?? formatEnumLabel(level);
}

/**
 * Returns a human-readable label for a given Stage.
 * Falls back to a generic formatter if not explicitly mapped.
 *
 * @param stage - The Stage enum value.
 * @returns A human-readable label for the stage.
 */
export function labelForStage(stage: Stage): string {
  return STAGE_LABELS[stage] ?? formatEnumLabel(stage);
}

/**
 * Returns a human-readable label for a given country enum value.
 *
 * The function first looks up a custom label in `COUNTRY_LABELS`
 * (e.g. "TR" -> "Turkey"). If no custom label is defined for the
 * provided code, it falls back to returning the raw enum value
 * itself (e.g. "TR").
 *
 * This makes the UI resilient when new country codes are added
 * at the database level: missing labels will still render as the
 * underlying enum code until `COUNTRY_LABELS` is updated.
 *
 * @param code - The CountryCode enum value.
 * @returns A human-readable label or the raw enum code.
 */
export function labelForCountry(code: CountryCode): string {
  return COUNTRY_LABELS[code] ?? code;
}

// ---------------------------------------------------------------------------
// Generic slug-map builder
// ---------------------------------------------------------------------------

/**
 * Builds bidirectional slug maps for a set of enum values.
 *
 * enumValue -> slug   (e.g. "DEVOPS_SRE_PLATFORM" -> "devops-sre-platform")
 * slug      -> enum   (e.g. "devops-sre-platform" -> "DEVOPS_SRE_PLATFORM")
 *
 * @param values - The enum values to index.
 * @returns An object with forward and reverse slug maps.
 */
function buildSlugMaps<E extends string>(
  values: readonly E[],
): {
  enumToSlug: Readonly<Record<E, string>>;
  slugToEnum: Readonly<Record<string, E>>;
} {
  const enumToSlugMap = {} as Record<E, string>;
  const slugToEnumMap: Record<string, E> = {};

  for (const value of values) {
    const slug = enumToSlug(value);
    enumToSlugMap[value] = slug;
    slugToEnumMap[slug] = value;
  }

  return {
    enumToSlug: Object.freeze(enumToSlugMap),
    slugToEnum: Object.freeze(slugToEnumMap),
  };
}

// ---------------------------------------------------------------------------
// Slug maps for PositionCategory (category filters in URLs)
// ---------------------------------------------------------------------------

const CATEGORY_SLUG_MAPS = buildSlugMaps(POSITION_CATEGORY_OPTIONS);

/**
 * Maps a PositionCategory enum value to its URL slug.
 *
 * @param cat - The PositionCategory enum value.
 * @returns The slug string for use in URLs.
 */
export function categoryEnumToSlug(cat: PositionCategory): string {
  return CATEGORY_SLUG_MAPS.enumToSlug[cat];
}

/**
 * Maps a category slug back to the corresponding PositionCategory value.
 *
 * @param slug - The slug string from the URL.
 * @returns The corresponding PositionCategory value, or undefined if unknown.
 */
export function categorySlugToEnum(slug: string): PositionCategory | undefined {
  return CATEGORY_SLUG_MAPS.slugToEnum[slug];
}

// ---------------------------------------------------------------------------
// Slug maps for JobLevel (seniority filters in URLs)
// ---------------------------------------------------------------------------

const SENIORITY_SLUG_MAPS = buildSlugMaps(JOB_LEVEL_OPTIONS);

/**
 * Maps a JobLevel enum value to its URL slug.
 *
 * @param level - The JobLevel enum value.
 * @returns The slug string for use in URLs.
 */
export function seniorityEnumToSlug(level: JobLevel): string {
  return SENIORITY_SLUG_MAPS.enumToSlug[level];
}

/**
 * Maps a seniority slug back to the corresponding JobLevel value.
 *
 * @param slug - The slug string from the URL.
 * @returns The corresponding JobLevel value, or undefined if unknown.
 */
export function senioritySlugToEnum(slug: string): JobLevel | undefined {
  return SENIORITY_SLUG_MAPS.slugToEnum[slug];
}

// ---------------------------------------------------------------------------
// Slug maps for Stage (pipeline stage filters in URLs)
// ---------------------------------------------------------------------------

const STAGE_SLUG_MAPS = buildSlugMaps(STAGE_OPTIONS);

/**
 * Maps a Stage enum value to its URL slug.
 *
 * @param stage - The Stage enum value.
 * @returns The slug string for use in URLs.
 */
export function stageEnumToSlug(stage: Stage): string {
  return STAGE_SLUG_MAPS.enumToSlug[stage];
}

/**
 * Maps a stage slug back to the corresponding Stage value.
 *
 * @param slug - The slug string from the URL.
 * @returns The corresponding Stage value, or undefined if unknown.
 */
export function stageSlugToEnum(slug: string): Stage | undefined {
  return STAGE_SLUG_MAPS.slugToEnum[slug];
}
