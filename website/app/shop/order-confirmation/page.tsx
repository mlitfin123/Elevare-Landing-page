import type { Metadata } from "next";
import Link from "next/link";
import { fulfillVerifiedShopSession } from "@/lib/shop-stripe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order Confirmation | ElevareFit",
  robots: { index: false, follow: false },
};

export default async function ShopOrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: checkoutSessionId } = await searchParams;
  let productName: string | null = null;

  if (checkoutSessionId) {
    try {
      const verified = await fulfillVerifiedShopSession(checkoutSessionId);
      productName = verified.product.name;
    } catch {
      productName = null;
    }
  }

  return (
    <div className="container">
      <section className="section shop-confirmation">
        <div className="panel">
          <div className="eyebrow">Shop</div>
          {productName ? (
            <>
              <h1>Order confirmed.</h1>
              <p>Your payment for {productName} was verified. Stripe will send your payment confirmation by email.</p>
            </>
          ) : (
            <>
              <h1>We could not confirm this order.</h1>
              <p>No verified paid order was found for this checkout session.</p>
            </>
          )}
          <Link className="button button-secondary" href="/shop/">Return to Shop</Link>
        </div>
      </section>
    </div>
  );
}
