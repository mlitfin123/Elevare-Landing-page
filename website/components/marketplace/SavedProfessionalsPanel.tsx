"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { getMarketplaceAppUserByAuthId } from "@/lib/marketplace-account";
import { buildProfessionalPath, formatCategoryList } from "@/lib/marketplace-helpers";
import type { MarketplaceSnapshot, ProfessionalProfileRecord } from "@/lib/marketplace-types";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type SavedRecord = {
  id: string;
  trainer_profile_id: string;
  created_at: string;
};

export function SavedProfessionalsPanel() {
  const { user, isLoading, isConfigured } = useSupabaseSession();
  const [savedRecords, setSavedRecords] = useState<SavedRecord[]>([]);
  const [snapshot, setSnapshot] = useState<MarketplaceSnapshot | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");

  useEffect(() => {
    fetch("/marketplace-data.json")
      .then((response) => response.json())
      .then((data: MarketplaceSnapshot) => setSnapshot(data))
      .catch(() => setSnapshot({ generatedAt: null, categories: [], professionals: [] }));
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user) {
      return;
    }

    getMarketplaceAppUserByAuthId(supabase, user.id)
      .then(async (appUser) => {
        if (!appUser) {
          setSavedRecords([]);
          return;
        }

        const { data } = await supabase
          .from("saved_trainer_profiles")
          .select("id,trainer_profile_id,created_at")
          .eq("client_user_id", appUser.id)
          .order("created_at", { ascending: false });

        setSavedRecords((data as SavedRecord[]) ?? []);
      })
      .catch((error) => {
        setFeedback(error instanceof Error ? error.message : "We could not load your saved profiles.");
        setFeedbackType("error");
      });
  }, [user]);

  const savedProfessionals = useMemo<ProfessionalProfileRecord[]>(() => {
    if (!snapshot) {
      return [];
    }

    const ids = new Set(savedRecords.map((record) => record.trainer_profile_id));
    return snapshot.professionals.filter((professional) => ids.has(professional.id));
  }, [savedRecords, snapshot]);

  async function handleRemove(professionalId: string) {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user) {
      return;
    }

    const appUser = await getMarketplaceAppUserByAuthId(supabase, user.id);

    if (!appUser) {
      setFeedback("We couldn't find your marketplace user record yet.");
      setFeedbackType("error");
      return;
    }

    const { error } = await supabase
      .from("saved_trainer_profiles")
      .delete()
      .eq("client_user_id", appUser.id)
      .eq("trainer_profile_id", professionalId);

    if (error) {
      setFeedback(error.message);
      setFeedbackType("error");
      return;
    }

    setSavedRecords((current) => current.filter((record) => record.trainer_profile_id !== professionalId));
    setFeedback("Saved profiles updated.");
    setFeedbackType("success");
  }

  if (!isConfigured) {
    return (
      <article className="callout">
        <span className="meta-pill">Configuration needed</span>
        <h2>Marketplace auth is not configured yet.</h2>
        <p>Add the second Supabase public URL and anon key to enable saved profiles.</p>
      </article>
    );
  }

  if (isLoading) {
    return (
      <article className="callout">
        <span className="meta-pill">Loading</span>
        <h2>Loading your saved profiles.</h2>
        <p>One moment while we check your account.</p>
      </article>
    );
  }

  if (!user) {
    return (
      <article className="callout">
        <span className="meta-pill">Sign in required</span>
        <h2>Sign in to view your saved profiles.</h2>
        <div className="button-row">
          <Link className="button button-primary" href="/sign-in/?redirect=/account/saved/">
            Sign in
          </Link>
        </div>
      </article>
    );
  }

  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">Saved</div>
        <h2 className="section-title">Come back to people you want to compare later.</h2>
        <p className="section-copy">
          Save profiles while browsing so you can compare specialties, location, pricing, and service mode
          before reaching out.
        </p>
      </div>

      {savedProfessionals.length > 0 ? (
        <div className="account-list">
          {savedProfessionals.map((professional) => (
            <article key={professional.id} className="panel account-list-card">
              <span className="meta-pill">{formatCategoryList(professional.categories) || "Profile"}</span>
              <h3>{professional.displayName}</h3>
              <p>{professional.professionalTitle || professional.bio}</p>
              <div className="button-row">
                <Link className="button button-secondary" href={buildProfessionalPath(professional.profileSlug)}>
                  View profile
                </Link>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => handleRemove(professional.id)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <article className="callout">
          <span className="meta-pill">Nothing saved yet</span>
          <h2>You haven&apos;t saved any profiles yet.</h2>
          <p>Browse the directory, open a profile, and save the people you want to revisit later.</p>
          <div className="button-row">
            <Link className="button button-primary" href="/professionals/">
              Browse profiles
            </Link>
          </div>
        </article>
      )}

      {feedback ? <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`}>{feedback}</div> : null}
    </section>
  );
}
