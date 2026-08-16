type PublicSupabaseProjectConfig = {
  projectId: string | null;
  url: string | null;
  anonKey: string | null;
  isConfigured: boolean;
};

type ServerSupabaseProjectConfig = PublicSupabaseProjectConfig & {
  serviceRoleKey: string | null;
  isServerConfigured: boolean;
};

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildProjectUrl(url: string | undefined, fallbackProjectId?: string) {
  const normalizedUrl = normalizeEnvValue(url);

  if (normalizedUrl) {
    return normalizedUrl;
  }

  const normalizedProjectId = normalizeEnvValue(fallbackProjectId);
  return normalizedProjectId ? `https://${normalizedProjectId}.supabase.co` : null;
}

function inferProjectId(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    const hostname = new URL(url).hostname;
    const [subdomain] = hostname.split(".");
    return subdomain || null;
  } catch {
    return null;
  }
}

function createPublicConfig({
  url,
  anonKey,
}: {
  url: string | undefined;
  anonKey: string | undefined;
}): PublicSupabaseProjectConfig {
  const resolvedUrl = buildProjectUrl(url);
  const resolvedAnonKey = normalizeEnvValue(anonKey);

  return {
    projectId: inferProjectId(resolvedUrl),
    url: resolvedUrl,
    anonKey: resolvedAnonKey,
    isConfigured: Boolean(resolvedUrl && resolvedAnonKey),
  };
}

function createServerConfig({
  url,
  anonKey,
  serviceRoleKey,
}: {
  url: string | undefined;
  anonKey: string | undefined;
  serviceRoleKey: string | undefined;
}): ServerSupabaseProjectConfig {
  const publicConfig = createPublicConfig({ url, anonKey });
  const resolvedServiceRoleKey = normalizeEnvValue(serviceRoleKey);

  return {
    ...publicConfig,
    serviceRoleKey: resolvedServiceRoleKey,
    isServerConfigured: Boolean(publicConfig.url && resolvedServiceRoleKey),
  };
}

export function getPrimarySupabasePublicConfig() {
  return createPublicConfig({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function getSecondarySupabasePublicConfig() {
  return createPublicConfig({
    url: process.env.NEXT_PUBLIC_SECOND_SUPABASE_URL ?? process.env.SECOND_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SECOND_SUPABASE_ANON_KEY,
  });
}

export function getPrimarySupabaseServerConfig() {
  return createServerConfig({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

export function getSecondarySupabaseServerConfig() {
  return createServerConfig({
    url: process.env.NEXT_PUBLIC_SECOND_SUPABASE_URL ?? process.env.SECOND_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SECOND_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SECOND_SUPABASE_SERVICE_ROLE_KEY,
  });
}
