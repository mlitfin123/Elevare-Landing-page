export type DistanceUnit = "mi" | "km";

const COUNTRY_CODES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(" ");

const PRIORITY_COUNTRY_CODES = ["US", "CA", "GB", "AU"] as const;

export const US_STATE_OPTIONS = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
  ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"],
  ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
  ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"],
  ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
  ["AS", "American Samoa"], ["GU", "Guam"], ["MP", "Northern Mariana Islands"],
  ["PR", "Puerto Rico"], ["VI", "U.S. Virgin Islands"],
] as const;

export const CANADA_REGION_OPTIONS = [
  ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"],
  ["NB", "New Brunswick"], ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"],
  ["NT", "Northwest Territories"], ["NU", "Nunavut"], ["ON", "Ontario"],
  ["PE", "Prince Edward Island"], ["QC", "Quebec"], ["SK", "Saskatchewan"],
  ["YT", "Yukon"],
] as const;

export const AUSTRALIA_REGION_OPTIONS = [
  ["ACT", "Australian Capital Territory"], ["NSW", "New South Wales"],
  ["NT", "Northern Territory"], ["QLD", "Queensland"], ["SA", "South Australia"],
  ["TAS", "Tasmania"], ["VIC", "Victoria"], ["WA", "Western Australia"],
] as const;

export const COMMON_CURRENCY_CODES = [
  "USD", "CAD", "GBP", "EUR", "AUD", "NZD", "JPY", "CHF", "SGD", "HKD",
  "INR", "BRL", "MXN", "ZAR", "AED",
] as const;

const COUNTRY_CURRENCY_DEFAULTS: Readonly<Record<string, string>> = {
  US: "USD",
  CA: "CAD",
  GB: "GBP",
  AU: "AUD",
  NZ: "NZD",
};

export function normalizeCountryCode(value: unknown, fallback = "US") {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{2}$/.test(normalized) ? normalized : fallback;
}

export function normalizeCurrencyCode(value: unknown, fallback = "USD") {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{3}$/.test(normalized) ? normalized : fallback;
}

export function getCountryDisplayName(countryCode: string | null | undefined, locale = "en") {
  const code = normalizeCountryCode(countryCode, "");
  if (!code) return "";
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function getCountryOptions(locale = "en") {
  const priority = new Set<string>(PRIORITY_COUNTRY_CODES);
  const options = COUNTRY_CODES.map((code) => ({ code, label: getCountryDisplayName(code, locale) }));
  const featured = PRIORITY_COUNTRY_CODES.map((code) => options.find((option) => option.code === code)!);
  const remaining = options
    .filter((option) => !priority.has(option.code))
    .sort((left, right) => left.label.localeCompare(right.label, locale));
  return [...featured, ...remaining];
}

export function getRegionLabel(countryCode: string) {
  switch (normalizeCountryCode(countryCode)) {
    case "US":
      return "State";
    case "CA":
      return "Province / Territory";
    case "AU":
      return "State / Territory";
    case "GB":
      return "Region / County";
    default:
      return "State / Province / Region";
  }
}

export function getRegionOptions(countryCode: string): readonly (readonly [string, string])[] {
  switch (normalizeCountryCode(countryCode)) {
    case "US":
      return US_STATE_OPTIONS;
    case "CA":
      return CANADA_REGION_OPTIONS;
    case "AU":
      return AUSTRALIA_REGION_OPTIONS;
    default:
      return [];
  }
}

export function isRegionRequired(countryCode: string) {
  return ["US", "CA", "AU"].includes(normalizeCountryCode(countryCode));
}

export function normalizeRegionValue(countryCode: string, value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return "";
  const match = getRegionOptions(countryCode).find(
    ([code, label]) => code.toLowerCase() === normalized.toLowerCase()
      || label.toLowerCase() === normalized.toLowerCase(),
  );
  return match?.[0] ?? normalized;
}

export function getRegionDisplayName(countryCode: string | null | undefined, value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return "";
  const country = normalizeCountryCode(countryCode, "");
  if (!country) return normalized;
  const match = getRegionOptions(country).find(
    ([code, label]) => code.toLowerCase() === normalized.toLowerCase()
      || label.toLowerCase() === normalized.toLowerCase(),
  );
  return match?.[1] ?? normalized;
}

export function getDistanceUnit(countryCode: string): DistanceUnit {
  return normalizeCountryCode(countryCode) === "US" ? "mi" : "km";
}

export function milesToMeters(miles: number) {
  return Math.round(miles * 1609.344);
}

export function kilometersToMeters(kilometers: number) {
  return Math.round(kilometers * 1000);
}

export function metersToMiles(meters: number) {
  return meters / 1609.344;
}

export function metersToKilometers(meters: number) {
  return meters / 1000;
}

export function distanceToMeters(value: number, unit: DistanceUnit) {
  return unit === "mi" ? milesToMeters(value) : kilometersToMeters(value);
}

export function metersToDistance(meters: number, unit: DistanceUnit) {
  return unit === "mi" ? metersToMiles(meters) : metersToKilometers(meters);
}

export function getDistanceOptions(countryCode: string) {
  const unit = getDistanceUnit(countryCode);
  const unitLabel = unit === "mi" ? "miles" : "km";
  return [5, 10, 25, 50].map((value) => ({
    value: String(value),
    label: `${value} ${unitLabel}`,
    meters: distanceToMeters(value, unit),
  }));
}

export function formatDistanceForCountry(meters: number | null | undefined, countryCode: string) {
  if (meters == null || !Number.isFinite(meters) || meters <= 0) return null;
  const unit = getDistanceUnit(countryCode);
  const distance = metersToDistance(meters, unit);
  const rounded = distance >= 10 ? Math.round(distance) : Math.round(distance * 10) / 10;
  return `${rounded} ${unit === "mi" ? (rounded === 1 ? "mile" : "miles") : "km"}`;
}

export function getDefaultCurrencyCode(countryCode: string) {
  return COUNTRY_CURRENCY_DEFAULTS[normalizeCountryCode(countryCode)] ?? "USD";
}

export function formatMarketplaceLocation({
  city,
  region,
  countryCode,
  includeCountry = false,
}: {
  city?: string | null;
  region?: string | null;
  countryCode?: string | null;
  includeCountry?: boolean;
}) {
  const country = normalizeCountryCode(countryCode, "");
  const normalizedRegion = country === "US"
    ? normalizeRegionValue(country, region)
    : getRegionDisplayName(country, region);
  const parts = [city?.trim(), normalizedRegion].filter(Boolean) as string[];
  if (country && (includeCountry || (country !== "US" && parts.length > 0))) {
    parts.push(getCountryDisplayName(country));
  }
  return parts.join(", ");
}

export function formatPublicLocation({
  city,
  region,
  countryCode,
}: {
  city?: string | null;
  region?: string | null;
  countryCode?: string | null;
}) {
  const country = normalizeCountryCode(countryCode, "");
  const parts = [city?.trim(), getRegionDisplayName(country, region)].filter(Boolean) as string[];
  if (country) parts.push(getCountryDisplayName(country));
  return parts.join(", ");
}

export function formatSeoLocation({
  city,
  region,
  countryCode,
}: {
  city?: string | null;
  region?: string | null;
  countryCode?: string | null;
}) {
  const country = normalizeCountryCode(countryCode, "");
  const normalizedCity = city?.trim() ?? "";
  const normalizedRegion = country === "US"
    ? normalizeRegionValue(country, region)
    : getRegionDisplayName(country, region);

  if (country === "GB" && normalizedCity) return normalizedCity;

  const localParts = [normalizedCity, normalizedRegion].filter(Boolean);
  if (localParts.length > 0) return localParts.join(", ");
  return country ? getCountryDisplayName(country) : "";
}
