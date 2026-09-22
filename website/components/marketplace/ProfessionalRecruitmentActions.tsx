"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { trackEvent } from "@/lib/analytics";
import { getProfessionalProfilePath } from "@/lib/auth-redirect";
import type { Locale } from "@/lib/i18n/config";
import { getMarketplaceAppUserByAuthId } from "@/lib/marketplace-account";
import {
  appendProfessionalAcquisitionParams,
  getProfessionalAcquisitionCopy,
  getProfessionalSignupHref,
  professionalAcquisitionAnalytics,
  readProfessionalAcquisitionAttribution,
} from "@/lib/professional-acquisition";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type ProfessionalCtaAccountState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  professionalStatus: string | null;
};

const ProfessionalCtaAccountContext = createContext<ProfessionalCtaAccountState>({
  isLoading: true,
  isAuthenticated: false,
  professionalStatus: null,
});

export function ProfessionalRecruitmentActionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isLoading: isSessionLoading } = useSupabaseSession();
  const [professionalStatus, setProfessionalStatus] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (isSessionLoading) return () => { isMounted = false; };

    if (!user) return () => { isMounted = false; };

    void (async () => {
      let nextStatus: string | null = null;
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) return;
        const appUser = await getMarketplaceAppUserByAuthId(supabase, user.id);
        if (!appUser) return;
        const { data, error } = await supabase
          .from("marketplace_trainer_profile_status_v1")
          .select("marketplace_status")
          .eq("user_id", appUser.id)
          .maybeSingle();
        if (!error) nextStatus = data?.marketplace_status ?? null;
      } catch {
        // An authenticated user can still continue directly to the existing
        // professional workspace if the optional CTA status lookup is unavailable.
      } finally {
        if (isMounted) {
          setProfessionalStatus(nextStatus);
          setResolvedUserId(user.id);
        }
      }
    })();

    return () => { isMounted = false; };
  }, [isSessionLoading, user]);

  const hasResolvedProfile = Boolean(user && resolvedUserId === user.id);

  return (
    <ProfessionalCtaAccountContext.Provider value={{
      isLoading: isSessionLoading || Boolean(user && !hasResolvedProfile),
      isAuthenticated: Boolean(user),
      professionalStatus: hasResolvedProfile ? professionalStatus : null,
    }}>
      {children}
    </ProfessionalCtaAccountContext.Provider>
  );
}

export function ProfessionalRecruitmentTracker() {
  const searchParams = useSearchParams();
  const viewed = useRef(false);
  const attribution = readProfessionalAcquisitionAttribution(searchParams);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    trackEvent("professional_landing_view", professionalAcquisitionAnalytics(attribution));
  }, [attribution]);

  return null;
}

export function ProfessionalRecruitmentCta({
  locale,
  placement,
  className,
  children,
}: {
  locale: Locale;
  placement: "hero" | "founding_section" | "final_cta";
  className?: string;
  children: ReactNode;
}) {
  const searchParams = useSearchParams();
  const attribution = readProfessionalAcquisitionAttribution(searchParams);
  const accountState = useContext(ProfessionalCtaAccountContext);
  const signupHref = getProfessionalSignupHref(locale, attribution);
  const profileHref = appendProfessionalAcquisitionParams(getProfessionalProfilePath(locale), attribution);
  const href = accountState.isAuthenticated ? profileHref : signupHref;
  const copy = getProfessionalAcquisitionCopy(locale);
  const label = accountState.isAuthenticated
    ? getAuthenticatedCtaLabel(copy, accountState.professionalStatus)
    : children;

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    let destination = href;
    let accountType = accountState.isAuthenticated ? "existing_account" : "new_account_or_existing_unknown";
    let navigateManually = false;

    if (accountState.isLoading) {
      event.preventDefault();
      navigateManually = true;
      const supabase = getSupabaseBrowserClient();
      const sessionResult = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const hasSession = Boolean(sessionResult.data.session?.user);
      destination = hasSession ? profileHref : signupHref;
      accountType = hasSession ? "existing_account" : "new_account_or_existing_unknown";
    }

    trackEvent("professional_landing_cta_click", {
      ...professionalAcquisitionAnalytics(attribution),
      cta_location: placement,
      destination_url: destination,
      account_type: accountType,
      professional_status: accountState.professionalStatus ?? undefined,
    });

    if (navigateManually) window.location.assign(destination);
  }

  return (
    <Link
      className={className}
      href={href}
      onClick={(event) => { void handleClick(event); }}
    >
      {label}
    </Link>
  );
}

function getAuthenticatedCtaLabel(
  copy: ReturnType<typeof getProfessionalAcquisitionCopy>,
  status: string | null,
) {
  if (status === "draft" || status === "rejected") return copy.actions.continueProfile;
  if (status === "pending" || status === "pending_review") return copy.actions.viewApplicationStatus;
  if (status === "approved" || status === "verified") return copy.actions.manageProfile;
  return copy.hero.cta;
}
