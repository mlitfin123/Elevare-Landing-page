import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_BASE = "https://api.resend.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const allowedOrigins = new Set([
  "https://www.elevarefit.org",
  "https://elevarefit.org",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

type WaitlistPayload = {
  name?: string;
  email?: string;
  city?: string;
  role?: string;
  website?: string;
};

class ResendApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ResendApiError";
  }
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json(
      { ok: false, message: "Method not allowed." },
      { status: 405, headers: corsHeaders },
    );
  }

  if (origin && !allowedOrigins.has(origin)) {
    return json(
      { ok: false, message: "Origin not allowed." },
      { status: 403, headers: corsHeaders },
    );
  }

  if (!RESEND_API_KEY) {
    return json(
      { ok: false, message: "Server configuration is incomplete." },
      { status: 500, headers: corsHeaders },
    );
  }

  let payload: WaitlistPayload;

  try {
    payload = await request.json();
  } catch {
    return json(
      { ok: false, message: "Invalid request body." },
      { status: 400, headers: corsHeaders },
    );
  }

  if (payload.website?.trim()) {
    return json(
      { ok: true, status: "ignored" },
      { headers: corsHeaders },
    );
  }

  const email = payload.email?.trim().toLowerCase() ?? "";
  const city = payload.city?.trim() ?? "";
  const name = payload.name?.trim() ?? "";
  const role = normalizeRole(payload.role);

  if (!email || !isValidEmail(email)) {
    return json(
      { ok: false, message: "Please enter a valid email address." },
      { status: 400, headers: corsHeaders },
    );
  }

  if (!city) {
    return json(
      { ok: false, message: "Please enter your city." },
      { status: 400, headers: corsHeaders },
    );
  }

  if (!role) {
    return json(
      { ok: false, message: "Please choose whether you are joining as a member or coach." },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const status = await upsertContact({
      email,
      name,
      city,
      role,
    });

    return json(
      { ok: true, status },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("Resend waitlist signup failed", error);

    const message =
      error instanceof ResendApiError
        ? error.message
        : "We could not submit the form. Please try again.";

    return json(
      { ok: false, message },
      { status: 500, headers: corsHeaders },
    );
  }
});

async function upsertContact({
  email,
  name,
  city,
  role,
}: {
  email: string;
  name: string;
  city: string;
  role: "member" | "coach";
}) {
  const body = {
    unsubscribed: false,
    firstName: name || undefined,
    properties: {
      role,
      city,
      source: "website",
    },
  };

  try {
    await resendRequest(`/contacts/${encodeURIComponent(email)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return "updated" as const;
  } catch (error) {
    if (!(error instanceof ResendApiError) || error.status !== 404) {
      throw error;
    }
  }

  await resendRequest("/contacts", {
    method: "POST",
    body: JSON.stringify({
      email,
      ...body,
    }),
  });

  return "created" as const;
}

async function resendRequest(path: string, init: RequestInit) {
  const response = await fetch(`${RESEND_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const raw = await response.text();
  const data = raw ? safeJsonParse(raw) : null;

  if (!response.ok) {
    throw new ResendApiError(response.status, getResendMessage(data));
  }

  return data;
}

function buildCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : allowedOrigins.values().next().value;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
    "Content-Type": "application/json",
  };
}

function normalizeRole(role: string | undefined) {
  if (!role) {
    return null;
  }

  const normalized = role.trim().toLowerCase();
  if (normalized === "member" || normalized === "coach") {
    return normalized;
  }

  return null;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return { message: value };
  }
}

function getResendMessage(data: Record<string, unknown> | null) {
  const message = data?.message;
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }

  return "Resend could not process the signup.";
}

function json(body: Record<string, unknown>, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}
