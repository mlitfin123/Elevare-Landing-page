import type { SupabaseClient } from "@supabase/supabase-js";

export type MarketplaceAppUserRecord = {
  id: string;
  auth_id: string;
  email: string | null;
  role: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  is_active: boolean | null;
  profile_photo_storage_path: string | null;
};

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function humanizeMarketplaceValue(value: string | null | undefined) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  return normalized
    .replaceAll(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function buildAvailabilitySummaryText(value: unknown) {
  if (typeof value === "string") {
    return normalizeText(value);
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as {
    days?: unknown;
    windows?: unknown;
  };

  const dayLabel = Array.isArray(record.days)
    ? record.days
        .map((entry) => humanizeMarketplaceValue(typeof entry === "string" ? entry : null))
        .filter(Boolean)
        .join(", ")
    : "";
  const windowLabel = Array.isArray(record.windows)
    ? record.windows
        .map((entry) => humanizeMarketplaceValue(typeof entry === "string" ? entry : null))
        .filter(Boolean)
        .join(", ")
    : "";

  if (dayLabel && windowLabel) {
    return `${dayLabel} · ${windowLabel}`;
  }

  return dayLabel || windowLabel || null;
}

export function parseBudgetInput(value: string) {
  const numbers = (value.match(/\d+(?:\.\d+)?/g) ?? [])
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry > 0);

  if (numbers.length === 0) {
    return {
      budgetMinCents: null,
      budgetMaxCents: null,
    };
  }

  const budgetMinCents = Math.round(numbers[0] * 100);
  const budgetMaxCents = Math.round((numbers[1] ?? numbers[0]) * 100);

  return {
    budgetMinCents,
    budgetMaxCents,
  };
}

export function parseGoalTags(value: string, categorySlugs: string[] = []) {
  const rawEntries = value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return [...new Set([...categorySlugs, ...rawEntries])];
}

export function deriveDeliveryModes(serviceModes: string[], remoteAvailable: boolean) {
  const supportedModes = new Set<string>();

  for (const serviceMode of serviceModes) {
    if (serviceMode === "hybrid") {
      supportedModes.add("hybrid");
      supportedModes.add("online");
      supportedModes.add("in_person");
      continue;
    }

    if (serviceMode === "online" || serviceMode === "in_person") {
      supportedModes.add(serviceMode);
    }
  }

  if (remoteAvailable) {
    supportedModes.add("online");
  }

  return [...supportedModes];
}

export function deriveTrainerModality(serviceModes: string[], remoteAvailable: boolean) {
  const deliveryModes = deriveDeliveryModes(serviceModes, remoteAvailable);
  const hasOnline = deliveryModes.includes("online");
  const hasInPerson = deliveryModes.includes("in_person") || deliveryModes.includes("hybrid");

  if (hasOnline && hasInPerson) {
    return "both";
  }

  if (hasOnline) {
    return "online";
  }

  if (hasInPerson) {
    return "in_person";
  }

  return null;
}

export async function getMarketplaceAppUserByAuthId(
  supabase: SupabaseClient,
  authUserId: string,
) {
  const { data, error } = await supabase
    .from("users")
    .select("id,auth_id,email,role,first_name,last_name,profile_photo_url,is_active,profile_photo_storage_path")
    .eq("auth_id", authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as MarketplaceAppUserRecord | null) ?? null;
}
