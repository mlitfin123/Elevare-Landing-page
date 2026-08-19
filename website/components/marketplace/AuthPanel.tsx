"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import { getSupabaseBrowserClient, isMarketplaceAuthConfigured } from "@/lib/supabase-browser";

export function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = useMemo(() => searchParams.get("redirect") || "/account/", [searchParams]);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasAcceptedLegalTerms, setHasAcceptedLegalTerms] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isConfigured = isMarketplaceAuthConfigured();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfigured) {
      setFeedback("Marketplace authentication is not configured yet.");
      setFeedbackType("error");
      return;
    }

    if (mode === "sign-up" && password !== confirmPassword) {
      setFeedback("Passwords do not match.");
      setFeedbackType("error");
      return;
    }

    if (mode === "sign-up" && !hasAcceptedLegalTerms) {
      setFeedback("Please agree to the Terms of Service and Privacy Policy to create an account.");
      setFeedbackType("error");
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setFeedback("Marketplace authentication is not configured yet.");
      setFeedbackType("error");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        router.push(redirectPath);
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            legal_acceptance: true,
            legal_acceptance_source: "website_signup",
            terms_version: TERMS_VERSION,
            privacy_version: PRIVACY_VERSION,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        router.push(redirectPath);
        router.refresh();
        return;
      }

      setFeedback("Account created. Check your email if confirmation is enabled, then sign in.");
      setFeedbackType("success");
      setMode("sign-in");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "We could not complete that request.");
      setFeedbackType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="waitlist-card auth-card">
      <div className="card-kicker">Elevare account</div>
      <h2>{mode === "sign-in" ? "Sign in to continue." : "Create your marketplace account."}</h2>
      <p>
        Browsing profiles stays public. Sign in when you want to save profiles, send a consultation
        request, or build your own listing.
      </p>

      <div className="audience-switcher" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          role="tab"
          className={`audience-option${mode === "sign-in" ? " is-active" : ""}`}
          aria-selected={mode === "sign-in"}
          onClick={() => setMode("sign-in")}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          className={`audience-option${mode === "sign-up" ? " is-active" : ""}`}
          aria-selected={mode === "sign-up"}
          onClick={() => setMode("sign-up")}
        >
          Create account
        </button>
      </div>

      <form className="waitlist-form" onSubmit={handleSubmit}>
        <div className="field-grid">
          <label className="field field-full">
            <span className="field-label">Email address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="field field-full">
            <span className="field-label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
            />
          </label>

          {mode === "sign-up" ? (
            <>
              <label className="field field-full">
                <span className="field-label">Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm password"
                  required
                />
              </label>
              <label className="checkbox-row professional-attestation field-full">
                <input
                  type="checkbox"
                  checked={hasAcceptedLegalTerms}
                  onChange={(event) => setHasAcceptedLegalTerms(event.target.checked)}
                />
                <span>
                  I agree to the <Link href="/terms-of-service.html">Terms of Service</Link> and acknowledge the{" "}
                  <Link href="/privacy-policy.html">Privacy Policy</Link>.
                </span>
              </label>
            </>
          ) : null}
        </div>

        <div className="form-note">
          After you sign in, you can save profiles, request consultations, manage your private client
          profile, or build your public profile.
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="button button-primary"
            disabled={isSubmitting || (mode === "sign-up" && !hasAcceptedLegalTerms)}
          >
            {isSubmitting ? "Submitting..." : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
          {feedback ? <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`}>{feedback}</div> : null}
        </div>
      </form>
    </article>
  );
}
