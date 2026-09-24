"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuthIntent, getAuthReturnPath, getSafeAuthRedirect } from "@/lib/auth-redirect";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { marketplaceText } from "@/lib/i18n/marketplace-content";
import { clearPendingOAuthSignup, readPendingOAuthSignup } from "@/lib/oauth-signup";
import { getSupabaseBrowserClient, isMarketplaceAuthConfigured } from "@/lib/supabase-browser";
import { trackEvent } from "@/lib/analytics";
import {
  professionalAcquisitionAnalytics,
  readProfessionalAcquisitionAttribution,
} from "@/lib/professional-acquisition";

export function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const intent = getAuthIntent(searchParams.get("intent"));
  const requestedLocale = searchParams.get("locale");
  const locale: Locale = isLocale(requestedLocale) ? requestedLocale : "en";
  const isSignup = searchParams.get("mode") === "sign-up";
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  const t = useCallback((value: string) => marketplaceText(locale, value), [locale]);
  const isConfigured = isMarketplaceAuthConfigured();
  const [error, setError] = useState<string | null>(providerError ?? (isConfigured ? null : t("Marketplace authentication is not configured yet.")));
  const completed = useRef(false);
  const completing = useRef(false);
  const attribution = readProfessionalAcquisitionAttribution(searchParams);
  const professionalAnalytics = professionalAcquisitionAnalytics(attribution);

  useEffect(() => {
    if (providerError || !isConfigured) return;

    const authClient = getSupabaseBrowserClient();
    if (!authClient) {
      return;
    }
    const client = authClient;

    let active = true;

    async function finishAuthentication() {
      if (completed.current || !active) return;

      const { data } = await client.auth.getSession();
      if (!data.session || completed.current || completing.current || !active) return;
      completing.current = true;

      if (isSignup) {
        const pendingSignup = readPendingOAuthSignup();
        if (!pendingSignup) {
          setError(t("We could not confirm your signup consent. Please start again."));
          await client.auth.signOut();
          completing.current = false;
          return;
        }

        const { error: updateError } = await client.auth.updateUser({ data: pendingSignup });
        if (updateError) {
          setError(updateError.message);
          await client.auth.signOut();
          completing.current = false;
          return;
        }

        clearPendingOAuthSignup();
        if (intent === "professional") {
          const accountCreatedAnalytics = { ...professionalAnalytics, account_type: "oauth_account" };
          trackEvent("professional_signup_completed", accountCreatedAnalytics);
          trackEvent("professional_account_created", accountCreatedAnalytics);
        }
      }

      completed.current = true;
      router.replace(getAuthReturnPath(getSafeAuthRedirect(redirect, ""), intent, locale));
      router.refresh();
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (session) void finishAuthentication();
    });

    void finishAuthentication();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [intent, isConfigured, isSignup, locale, professionalAnalytics, providerError, redirect, router, t]);

  const signInParams = new URLSearchParams();
  const safeRedirect = getSafeAuthRedirect(redirect, "");
  if (safeRedirect) signInParams.set("redirect", safeRedirect);
  if (intent === "professional") signInParams.set("intent", "professional");
  if (locale !== "en") signInParams.set("locale", locale);
  const signInHref = signInParams.size ? `/sign-in/?${signInParams}` : "/sign-in/";

  return (
    <article className="waitlist-card auth-card auth-callback-card" aria-live="polite">
      <div className="card-kicker">{t("Elevare account")}</div>
      <h2>{error ? t("We could not complete that request.") : t("Finishing your sign-in...")}</h2>
      <p>{error ?? t("Securely connecting your account.")}</p>
      {error ? <Link className="button button-primary" href={signInHref}>{t("Return to sign in")}</Link> : null}
    </article>
  );
}
