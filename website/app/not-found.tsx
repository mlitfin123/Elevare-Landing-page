import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    absolute: "Page Not Found | ElevareFit",
  },
};

export default function NotFoundPage() {
  return (
    <div className="container">
      <section className="hero hero-compact">
        <div className="eyebrow">404</div>
        <h1>This page could not be found.</h1>
        <p>The page may have moved, or the profile may no longer be publicly available.</p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/professionals/">
            Find support
          </Link>
          <Link className="button button-secondary" href="/">
            Return home
          </Link>
        </div>
      </section>
    </div>
  );
}
