import { Suspense } from "react";
import { AuthPanel } from "@/components/marketplace/AuthPanel";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Sign In",
  description:
    "Sign in to save profiles, request consultations, or manage your Elevare marketplace account.",
  pathname: "/sign-in",
  robots: {
    index: false,
    follow: false,
  },
});

export default function SignInPage() {
  return (
    <div className="container">
      <section className="section account-center-section">
        <Suspense fallback={null}>
          <AuthPanel />
        </Suspense>
      </section>
    </div>
  );
}
