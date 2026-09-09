"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { getMarketplaceAppUserByAuthId } from "@/lib/marketplace-account";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { localeFromPathname } from "@/lib/i18n/config";
import { marketplaceText } from "@/lib/i18n/marketplace-content";

type ProfessionalSaveButtonProps = {
  professionalId: string;
  professionalSlug: string;
  professionalName: string;
};

export function ProfessionalSaveButton({
  professionalId,
  professionalSlug,
  professionalName,
}: ProfessionalSaveButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = localeFromPathname(pathname);
  const t = (value: string) => marketplaceText(locale, value);
  const { user, isLoading, isConfigured } = useSupabaseSession();
  const [appUserId, setAppUserId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user) {
      return;
    }

    let isMounted = true;

    getMarketplaceAppUserByAuthId(supabase, user.id)
      .then(async (appUser) => {
        if (!appUser) {
          return null;
        }

        if (isMounted) {
          setAppUserId(appUser.id);
        }

        const { data } = await supabase
          .from("saved_trainer_profiles")
          .select("id")
          .eq("client_user_id", appUser.id)
          .eq("trainer_profile_id", professionalId)
          .maybeSingle();

        if (isMounted) {
          setIsSaved(Boolean(data));
        }

        return null;
      })
      .catch(() => {
        if (isMounted) {
          setFeedback(marketplaceText(locale, "We could not check your saved profiles right now."));
          setFeedbackType("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [locale, professionalId, user]);

  const effectiveIsSaved = user ? isSaved : false;

  async function handleSave() {
    if (!isConfigured) {
      setFeedback(t("Marketplace auth is not configured yet."));
      setFeedbackType("error");
      return;
    }

    if (!user) {
      router.push(`/sign-in/?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setFeedback(t("Marketplace auth is not configured yet."));
      setFeedbackType("error");
      return;
    }

    const resolvedAppUserId = appUserId ?? (await getMarketplaceAppUserByAuthId(supabase, user.id))?.id ?? null;

    if (!resolvedAppUserId) {
      setFeedback(t("We couldn't find your marketplace user record yet."));
      setFeedbackType("error");
      return;
    }

    setAppUserId(resolvedAppUserId);

    setIsWorking(true);
    setFeedback(null);

    try {
      if (effectiveIsSaved) {
        const { error } = await supabase
          .from("saved_trainer_profiles")
          .delete()
          .eq("client_user_id", resolvedAppUserId)
          .eq("trainer_profile_id", professionalId);

        if (error) {
          throw error;
        }

        setIsSaved(false);
        setFeedback(t("Removed from saved profiles."));
        setFeedbackType("success");
        trackEvent("professional_unsaved", {
          professional_slug: professionalSlug,
          professional_name: professionalName,
        });
        return;
      }

      const { error } = await supabase.from("saved_trainer_profiles").insert({
        client_user_id: resolvedAppUserId,
        trainer_profile_id: professionalId,
      });

      if (error) {
        throw error;
      }

      setIsSaved(true);
      setFeedback(t("Saved to your account."));
      setFeedbackType("success");
      trackEvent("professional_saved", {
        professional_slug: professionalSlug,
        professional_name: professionalName,
      });
    } catch {
      setFeedback(t("We could not update your saved profiles."));
      setFeedbackType("error");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="marketplace-action-stack">
      <button
        type="button"
        className={`button ${effectiveIsSaved ? "button-secondary" : "button-primary"}`}
        onClick={handleSave}
        disabled={isLoading || isWorking}
      >
        {isWorking ? t("Updating...") : effectiveIsSaved ? t("Saved") : t("Save profile")}
      </button>
      {feedback ? <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`}>{feedback}</div> : null}
    </div>
  );
}
