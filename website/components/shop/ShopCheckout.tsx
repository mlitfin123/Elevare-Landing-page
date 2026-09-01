"use client";

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useCallback, useMemo, useRef, useState } from "react";

type ShopCheckoutResponse = {
  clientSecret?: string;
  checkoutSessionId?: string;
  error?: string;
};

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

function EmbeddedShopPayment({
  checkoutSessionId,
  clientSecret,
  onCancel,
}: {
  checkoutSessionId: string;
  clientSecret: string;
  onCancel: () => void;
}) {
  const handleComplete = useCallback(() => {
    window.location.assign(
      `/shop/order-confirmation/?session_id=${encodeURIComponent(checkoutSessionId)}`,
    );
  }, [checkoutSessionId]);
  const options = useMemo(
    () => ({ clientSecret, onComplete: handleComplete }),
    [clientSecret, handleComplete],
  );

  return (
    <div className="shop-embedded-payment" aria-label="Secure payment">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout className="shop-embedded-checkout" />
      </EmbeddedCheckoutProvider>
      <button className="button button-secondary shop-checkout-back" type="button" onClick={onCancel}>
        Back to product
      </button>
    </div>
  );
}

export function ShopCheckout({ productId }: { productId: string }) {
  const checkoutAttemptId = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setError(null);
    if (!stripePromise) {
      setError("Secure payment is temporarily unavailable. Please try again later.");
      return;
    }

    setLoading(true);
    try {
      checkoutAttemptId.current ??= crypto.randomUUID();
      const response = await fetch("/api/shop/checkout/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          quantity: 1,
          checkoutAttemptId: checkoutAttemptId.current,
        }),
      });
      const payload = (await response.json()) as ShopCheckoutResponse;
      if (!response.ok || !payload.clientSecret || !payload.checkoutSessionId) {
        throw new Error(payload.error || "Checkout could not be started. Please try again.");
      }
      setClientSecret(payload.clientSecret);
      setCheckoutSessionId(payload.checkoutSessionId);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be started.");
    } finally {
      setLoading(false);
    }
  }

  if (clientSecret && checkoutSessionId) {
    return (
      <EmbeddedShopPayment
        checkoutSessionId={checkoutSessionId}
        clientSecret={clientSecret}
        onCancel={() => {
          setClientSecret(null);
          setCheckoutSessionId(null);
          checkoutAttemptId.current = null;
        }}
      />
    );
  }

  return (
    <div className="shop-purchase-actions">
      <button className="button button-primary" type="button" onClick={startCheckout} disabled={loading}>
        {loading ? "Loading secure payment..." : "Buy now"}
      </button>
      {error ? <p className="form-feedback is-error" role="alert">{error}</p> : null}
    </div>
  );
}
