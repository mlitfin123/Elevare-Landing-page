"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type GoogleCredentialResponse = { credential?: string };

type GoogleIdentityApi = {
  initialize: (configuration: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    nonce: string;
    auto_select: boolean;
    cancel_on_tap_outside: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: {
    type: "standard";
    theme: "outline";
    size: "large";
    text: "signin_with" | "signup_with";
    shape: "rectangular";
    width: number;
    logo_alignment: "left";
  }) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentityApi } };
  }
}

type GoogleIdentityButtonProps = {
  clientId: string | undefined;
  disabled: boolean;
  isSignup: boolean;
  label: string;
  unavailableLabel: string;
  onCredential: (credential: string, nonce: string) => void;
  onFallback: () => void;
};

export function GoogleIdentityButton({
  clientId,
  disabled,
  isSignup,
  label,
  unavailableLabel,
  onCredential,
  onFallback,
}: GoogleIdentityButtonProps) {
  const buttonHost = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const host = buttonHost.current;
    if (!host || !clientId || !scriptLoaded || scriptFailed || disabled) return;
    const buttonElement = host;
    const resolvedClientId = clientId;

    let cancelled = false;

    async function renderGoogleButton() {
      const google = window.google?.accounts?.id;
      if (!google) {
        setScriptFailed(true);
        return;
      }

      const nonce = createNonce();
      const googleNonce = await hashNonce(nonce);
      if (cancelled) return;

      google.initialize({
        client_id: resolvedClientId,
        nonce: googleNonce,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: (response) => {
          if (response.credential) onCredentialRef.current(response.credential, nonce);
        },
      });

      buttonElement.replaceChildren();
      google.renderButton(buttonElement, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: isSignup ? "signup_with" : "signin_with",
        shape: "rectangular",
        width: Math.max(220, buttonElement.clientWidth || 240),
        logo_alignment: "left",
      });
    }

    void renderGoogleButton();
    return () => {
      cancelled = true;
      buttonElement.replaceChildren();
    };
  }, [clientId, disabled, isSignup, scriptFailed, scriptLoaded]);

  if (!clientId || scriptFailed) {
    return (
      <button type="button" className="auth-oauth-button" disabled={disabled} onClick={onFallback}>
        <GoogleIcon />
        {clientId ? label : unavailableLabel}
      </button>
    );
  }

  if (disabled) {
    return (
      <button type="button" className="auth-oauth-button" disabled>
        <GoogleIcon />
        {label}
      </button>
    );
  }

  return (
    <div className="auth-google-button-wrap">
      <Script
        id="google-identity-services"
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() => setScriptFailed(true)}
      />
      <div ref={buttonHost} className="auth-google-button" aria-label={label} aria-busy={!scriptLoaded} />
    </div>
  );
}

function createNonce() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashNonce(nonce: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function GoogleIcon() {
  return (
    <svg className="auth-oauth-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M21.35 12.23c0-.73-.06-1.2-.2-1.69H12v3.58h5.37c-.11.89-.7 2.23-2.02 3.13l-.02.12 2.94 2.28.2.02c1.85-1.71 2.88-4.22 2.88-7.44Z" />
      <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.37l-3.07-2.38c-.82.57-1.92.97-3.38.97-2.58 0-4.77-1.7-5.55-4.06l-.11.01-3.06 2.37-.04.11A9.75 9.75 0 0 0 12 21.75Z" />
      <path fill="#FBBC05" d="M6.45 13.91A5.9 5.9 0 0 1 6.14 12c0-.66.12-1.3.3-1.91v-.13L3.35 7.55l-.1.05A9.75 9.75 0 0 0 2.25 12c0 1.58.38 3.08 1 4.4l3.2-2.49Z" />
      <path fill="#EA4335" d="M12 6.03c1.85 0 3.1.8 3.81 1.47l2.78-2.7C16.83 3.18 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.75 5.4l3.2 2.49C7.23 7.75 9.42 6.03 12 6.03Z" />
    </svg>
  );
}
