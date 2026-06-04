"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

const MAILCHIMP_FORM_ACTION =
  "https://elevarestrong.us14.list-manage.com/subscribe/post?u=521587ae7856d1fcca983cb8d&id=a5887ce23e&f_id=001061e0f0";

const MAILCHIMP_FIELD_NAMES = {
  name: "FNAME",
  email: "EMAIL",
  city: "CITY",
  role: "MERGE4",
} as const;

const audienceConfig = {
  MEMBER: {
    mailchimpRoleValue: "Member",
    tags: "waitlist,member",
    note: "Members will hear when Elevare launches, where it is available, and when they can start exploring coaches.",
  },
  COACH: {
    mailchimpRoleValue: "Coach",
    tags: "waitlist,coach",
    note: "Coaches will hear when Elevare launches, when they can join, and how to start reaching new clients.",
  },
} as const;

type AudienceRole = keyof typeof audienceConfig;

type MailchimpResponse = {
  result?: "success" | "error";
  msg?: string;
};

declare global {
  interface Window {
    [key: string]: unknown;
  }
}

export function WaitlistForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [audience, setAudience] = useState<AudienceRole>("MEMBER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const currentAudience = audienceConfig[audience];
  const honeypotName = useMemo(() => {
    const actionUrl = new URL(MAILCHIMP_FORM_ACTION);
    return `b_${actionUrl.searchParams.get("u")}_${actionUrl.searchParams.get("id")}`;
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
      const response = await submitMailchimpJsonp({
        [MAILCHIMP_FIELD_NAMES.name]: name.trim(),
        [MAILCHIMP_FIELD_NAMES.email]: email.trim(),
        [MAILCHIMP_FIELD_NAMES.city]: city.trim(),
        [MAILCHIMP_FIELD_NAMES.role]: currentAudience.mailchimpRoleValue,
        TAGS: currentAudience.tags,
        [honeypotName]: "",
      });

      const message = cleanMailchimpMessage(response.msg || "");
      const alreadySubscribed = /already subscribed/i.test(message);

      if (response.result === "success" || alreadySubscribed) {
        trackEvent("generate_lead", {
          form_name: "waitlist",
          role: currentAudience.mailchimpRoleValue.toLowerCase(),
          lead_source: "website",
          signup_state: alreadySubscribed ? "already_subscribed" : "success",
        });
        setFeedback("");
        setIsSubmitted(true);
        return;
      }

      setFeedback(message || "We could not submit the form. Please try again.");
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
    <aside className="waitlist-card" id="waitlist">
      <div className="card-kicker">Join the list</div>
      <h2>Join the waitlist.</h2>
      <p>Sign up as a member or coach to hear when Elevare launches and when you can get started.</p>

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
        action={MAILCHIMP_FORM_ACTION}
        method="post"
        onSubmit={handleSubmit}
      >
        {!isSubmitted ? (
          <div className="form-main">
            <input type="hidden" name="TAGS" value={currentAudience.tags} />
            <input type="hidden" name={MAILCHIMP_FIELD_NAMES.role} value={currentAudience.mailchimpRoleValue} />
            <input type="hidden" name={honeypotName} value="" tabIndex={-1} autoComplete="off" />

            <div className="field-grid">
              <label className="field field-full" htmlFor="waitlist-name">
                <span className="field-label">Name</span>
                <input
                  id="waitlist-name"
                  name={MAILCHIMP_FIELD_NAMES.name}
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
                  name={MAILCHIMP_FIELD_NAMES.email}
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
                  name={MAILCHIMP_FIELD_NAMES.city}
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
                We will only use your email to send Elevare launch updates. You can unsubscribe anytime.
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
              You&apos;re on the list. We will reach out as launch access opens up. Keep an eye on your inbox
              for updates.
            </p>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Use a different email
            </button>
          </div>
        )}
      </form>

      <div className="micro-trust">
        <div className="micro-item">
          <strong>Launch updates</strong>
          <span>Stay in the loop as we get closer to opening access.</span>
        </div>
        <div className="micro-item">
          <strong>Better discovery</strong>
          <span>We are making it easier to find coaches who match your goals.</span>
        </div>
        <div className="micro-item">
          <strong>Easy booking</strong>
          <span>Designed to help you move from browsing to booking more smoothly.</span>
        </div>
      </div>
    </aside>
  );
}

function cleanMailchimpMessage(message: string) {
  return message.replace(/<[^>]*>/g, " ").replace(/^\d+\s*-\s*/, "").replace(/\s+/g, " ").trim();
}

function submitMailchimpJsonp(payload: Record<string, string>) {
  return new Promise<MailchimpResponse>((resolve, reject) => {
    const callbackName = `mailchimpCallback_${Date.now()}`;
    const actionUrl = new URL(MAILCHIMP_FORM_ACTION);
    actionUrl.pathname = actionUrl.pathname.replace("/post", "/post-json");
    actionUrl.searchParams.set("c", callbackName);

    Object.entries(payload).forEach(([fieldName, fieldValue]) => {
      actionUrl.searchParams.set(fieldName, fieldValue);
    });

    const roleValue = payload[MAILCHIMP_FIELD_NAMES.role];
    if (roleValue) {
      ["MERGE4", "MMERGE4", "ROLE"].forEach((fieldName) => {
        actionUrl.searchParams.set(fieldName, roleValue);
      });
    }

    let timeoutId = 0;
    const script = document.createElement("script");

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      script.remove();
      delete window[callbackName];
    };

    window[callbackName] = (response: MailchimpResponse) => {
      cleanup();
      resolve(response);
    };

    script.src = actionUrl.toString();
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error("Mailchimp request failed to load. Check the form action URL and try again."));
    };

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Mailchimp took too long to respond. Please try again."));
    }, 12000);

    document.body.appendChild(script);
  });
}
