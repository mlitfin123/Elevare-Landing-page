import { Suspense } from "react";
import { OAuthCallback } from "@/components/marketplace/OAuthCallback";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Finishing Sign In",
  description: "Completing your Elevare account sign-in.",
  pathname: "/auth/callback",
  robots: {
    index: false,
    follow: false,
  },
});

export default function AuthCallbackPage() {
  return (
    <div className="container">
      <section className="section account-center-section">
        <Suspense fallback={null}>
          <OAuthCallback />
        </Suspense>
      </section>
    </div>
  );
}
