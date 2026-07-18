"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { siteConfig } from "@/lib/site";

const WAITLIST_ENDPOINT = siteConfig.waitlist.endpoint;
const HONEYPOT_FIELD_NAME = "website";

const audienceConfig = {
  MEMBER: {
    roleValue: "Member",
    note: "Members will hear when Elevare opens, where it is available, and when they can start exploring trainer and coach options.",
  },
  COACH: {
    roleValue: "Coach",
    note: "Coaches will hear when Elevare opens, when they can join, and how to start reaching people looking for support.",
  },
} as const;

type AudienceRole = keyof typeof audienceConfig;

type WaitlistResponse = {
  ok?: boolean;
  status?: "created" | "updated" | "ignored";
  message?: string;
};

export function WaitlistForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const hasTrackedSectionView = useRef(false);
  const [audience, setAudience] = useState<AudienceRole>("MEMBER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const currentAudience = audienceConfig[audience];

  useEffect(() => {
    const section = sectionRef.current;

    if (!section || hasTrackedSectionView.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry?.isIntersecting || hasTrackedSectionView.current) {
          return;
        }

        hasTrackedSectionView.current = true;
        trackEvent("section_view", {
          section_name: "waitlist",
          section_context: "home_marketplace",
          product: "Elevare",
        });
        observer.disconnect();
      },
      {
        threshold: 0.35,
      },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = formRef.current;
    if (!form?.reportValidity()) {
      return;
    }

    setIsLoading(true);
    setFeedback("Submitting your signup...");
    setFeedbackType("success");

    try {
      const response = await submitWaitlistSignup({
        name: name.trim(),
        email: email.trim(),
        city: city.trim(),
        role: currentAudience.roleValue,
        [HONEYPOT_FIELD_NAME]: "",
      });

      if (response.ok) {
        if (response.status !== "ignored") {
          trackEvent("waitlist_submission", {
            form_name: "waitlist",
            role: currentAudience.roleValue.toLowerCase(),
            lead_source: "website",
            signup_state: response.status === "updated" ? "already_subscribed" : "success",
          });

          trackEvent("generate_lead", {
            form_name: "waitlist",
            role: currentAudience.roleValue.toLowerCase(),
            lead_source: "website",
            signup_state: response.status === "updated" ? "already_subscribed" : "success",
          });
        }

        setFeedback("");
        setIsSubmitted(true);
        return;
      }

      setFeedback(response.message || "We could not submit the form. Please try again.");
      setFeedbackType("error");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Something went wrong while submitting the form.",
      );
      setFeedbackType("error");
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setIsSubmitted(false);
    setFeedback("");
    setFeedbackType("success");
    setName("");
    setEmail("");
    setCity("");
  }

  return (
    <aside ref={sectionRef} className="waitlist-card" id="waitlist">
      <div className="card-kicker">Elevare marketplace</div>
      <h2>Join the Elevare waitlist.</h2>
      <p>Sign up as a member or coach to hear when the marketplace opens and when early access starts.</p>

      <div className="audience-switcher" role="tablist" aria-label="Audience">
        {(["MEMBER", "COACH"] as const).map((role) => {
          const isActive = audience === role;

          return (
            <button
              key={role}
              type="button"
              role="tab"
              className={`audience-option${isActive ? " is-active" : ""}`}
              aria-selected={isActive}
              onClick={() => setAudience(role)}
            >
              {role === "MEMBER" ? "Member" : "Coach"}
            </button>
          );
        })}
      </div>

      <form
        ref={formRef}
        className="waitlist-form"
        action={WAITLIST_ENDPOINT}
        method="post"
        onSubmit={handleSubmit}
      >
        {!isSubmitted ? (
          <div className="form-main">
            <input type="hidden" name="role" value={currentAudience.roleValue} />
            <input type="hidden" name={HONEYPOT_FIELD_NAME} value="" tabIndex={-1} autoComplete="off" />

            <div className="field-grid">
              <label className="field field-full" htmlFor="waitlist-name">
                <span className="field-label">Name</span>
                <input
                  id="waitlist-name"
                  name="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label className="field field-full" htmlFor="waitlist-email">
                <span className="field-label">Email address</span>
                <input
                  id="waitlist-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="field field-full" htmlFor="waitlist-city">
                <span className="field-label">City</span>
                <input
                  id="waitlist-city"
                  name="city"
                  type="text"
                  placeholder="Miami, FL"
                  required
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />
              </label>
            </div>

            <div className="form-note">{currentAudience.note}</div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? "Submitting..." : "Join the waitlist"}
              </button>
              <p className="fine-print">
                We will only use your email to send Elevare waitlist updates. You can unsubscribe anytime.
              </p>
              <div
                className={`form-feedback${feedback ? ` is-${feedbackType}` : ""}`}
                aria-live="polite"
              >
                {feedback}
              </div>
            </div>
          </div>
        ) : (
          <div className="form-success">
            <span className="success-tag">Waitlist</span>
            <h3>Confirmed</h3>
            <p>
              You&apos;re on the list. We will reach out as early access opens up. Keep an eye on your inbox
              for marketplace updates.
            </p>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Use a different email
            </button>
          </div>
        )}
      </form>

      <div className="micro-trust">
        <div className="micro-item">
          <strong>Early access</strong>
          <span>Stay in the loop as the marketplace gets closer to launch.</span>
        </div>
        <div className="micro-item">
          <strong>Member and coach updates</strong>
          <span>Get the rollout details that match the role you signed up with.</span>
        </div>
        <div className="micro-item">
          <strong>Smarter matching</strong>
          <span>Elevare is built to make finding the right fit feel clearer and simpler.</span>
        </div>
      </div>
    </aside>
  );
}

async function submitWaitlistSignup(payload: Record<string, string>) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(WAITLIST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => ({}))) as WaitlistResponse;

    if (!response.ok) {
      throw new Error(data.message || "We could not submit the form. Please try again.");
    }

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The signup request took too long. Please try again.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
