"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { SignOutButton } from "@/components/marketplace/SignOutButton";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { getMarketplaceAppUserByAuthId, type MarketplaceAppUserRecord } from "@/lib/marketplace-account";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type ProfessionalAccountState = {
  id: string;
  status: string;
  statusMessage: string | null;
  reviewFeedbackPublic: string | null;
  isPubliclyListed: boolean;
  publicSlug: string | null;
};

type MarketplaceAccountState = {
  user: User | null;
  appUser: MarketplaceAppUserRecord | null;
  isConfigured: boolean;
  isLoading: boolean;
  hasClientProfile: boolean;
  professionalProfile: ProfessionalAccountState | null;
};

const MarketplaceAccountContext = createContext<MarketplaceAccountState | null>(null);

const clientLinks = [
  { href: "/account/", label: "Overview" },
  { href: "/professionals/", label: "Explore" },
  { href: "/account/profile/", label: "Preferences" },
  { href: "/account/saved/", label: "Saved" },
  { href: "/account/inquiries/", label: "My Requests" },
];

const professionalLinks = [
  { href: "/account/professional-profile/", label: "Pro Profile" },
  { href: "/account/client-requests/", label: "Client Requests" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/account/") {
    return pathname === "/account" || pathname === "/account/";
  }

  return pathname === href || pathname === href.slice(0, -1);
}

export function useMarketplaceAccountState() {
  const context = useContext(MarketplaceAccountContext);

  if (!context) {
    throw new Error("useMarketplaceAccountState must be used within MarketplaceAccountShell.");
  }

  return context;
}

export function MarketplaceAccountShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const { user, isLoading: isSessionLoading, isConfigured } = useSupabaseSession();
  const [appUser, setAppUser] = useState<MarketplaceAppUserRecord | null>(null);
  const [hasClientProfile, setHasClientProfile] = useState(false);
  const [professionalProfile, setProfessionalProfile] = useState<ProfessionalAccountState | null>(null);
  const [resolvedAuthUserId, setResolvedAuthUserId] = useState<string | null>(null);
  const [isAccountLoading, setIsAccountLoading] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user) {
      return;
    }

    const marketplaceClient = supabase;
    const currentUser = user;
    let isMounted = true;

    async function loadAccountState() {
      setIsAccountLoading(true);

      try {
        const nextAppUser = await getMarketplaceAppUserByAuthId(marketplaceClient, currentUser.id);

        if (!nextAppUser) {
          if (isMounted) {
            setAppUser(null);
            setHasClientProfile(false);
            setProfessionalProfile(null);
            setResolvedAuthUserId(currentUser.id);
          }
          return;
        }

        const [clientProfileResult, professionalProfileResult] = await Promise.all([
          marketplaceClient.from("client_profiles").select("id").eq("user_id", nextAppUser.id).maybeSingle(),
          marketplaceClient
            .from("marketplace_trainer_profile_status_v1")
            .select(
              "trainer_profile_id,marketplace_status,status_message,is_publicly_listed,review_feedback_public,public_slug",
            )
            .eq("user_id", nextAppUser.id)
            .maybeSingle(),
        ]);

        if (!isMounted) {
          return;
        }

        const profile = professionalProfileResult.data;
        setAppUser(nextAppUser);
        setHasClientProfile(Boolean(clientProfileResult.data?.id));
        setResolvedAuthUserId(currentUser.id);
        setProfessionalProfile(
          profile?.trainer_profile_id
            ? {
                id: profile.trainer_profile_id,
                status: profile.marketplace_status ?? "draft",
                statusMessage: profile.status_message ?? null,
                reviewFeedbackPublic: profile.review_feedback_public ?? null,
                isPubliclyListed: Boolean(profile.is_publicly_listed),
                publicSlug: profile.public_slug ?? null,
              }
            : null,
        );
      } catch {
        if (isMounted) {
          setAppUser(null);
          setHasClientProfile(false);
          setProfessionalProfile(null);
          setResolvedAuthUserId(currentUser.id);
        }
      } finally {
        if (isMounted) {
          setIsAccountLoading(false);
        }
      }
    }

    loadAccountState();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const hasResolvedCurrentUser = Boolean(user && resolvedAuthUserId === user.id);
  const visibleAppUser = hasResolvedCurrentUser ? appUser : null;
  const visibleClientProfile = hasResolvedCurrentUser && hasClientProfile;
  const visibleProfessionalProfile = hasResolvedCurrentUser ? professionalProfile : null;

  const accountState = useMemo<MarketplaceAccountState>(
    () => ({
      user,
      appUser: visibleAppUser,
      isConfigured,
      isLoading: isSessionLoading || Boolean(user && (!hasResolvedCurrentUser || isAccountLoading)),
      hasClientProfile: visibleClientProfile,
      professionalProfile: visibleProfessionalProfile,
    }),
    [
      hasResolvedCurrentUser,
      isAccountLoading,
      isConfigured,
      isSessionLoading,
      user,
      visibleAppUser,
      visibleClientProfile,
      visibleProfessionalProfile,
    ],
  );

  const accountLinks = visibleProfessionalProfile ? [...clientLinks, ...professionalLinks] : clientLinks;

  return (
    <MarketplaceAccountContext.Provider value={accountState}>
      <section className="account-hero" aria-labelledby="account-heading">
        <div className="account-hero-copy">
          <div className="eyebrow">Account</div>
          <h1 id="account-heading">Your Elevare account</h1>
          <p>
            {visibleProfessionalProfile
              ? "Manage your marketplace activity, preferences, Pro profile, and client requests."
              : "Manage your preferences, saved profiles, and consultation requests."}
          </p>
        </div>

        {user ? (
          <div id="account-settings" className="account-settings-row">
            <div>
              <span className="stat-label">Account settings</span>
              <span className="account-email">Signed in as {user.email}</span>
            </div>
            <SignOutButton />
          </div>
        ) : null}
      </section>

      <nav className="account-nav" aria-label="Account">
        {accountLinks.map((link) => {
          const isActive = isActivePath(pathname, link.href);

          return (
            <Link
              key={link.href}
              className={`subnav-link${isActive ? " is-active" : ""}`}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </MarketplaceAccountContext.Provider>
  );
}
