import Link from "next/link";
import { AuthNavigationLink } from "@/components/AuthNavigationLink";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <div className="footer-copy">&copy; {new Date().getFullYear()} Elevare Fit LLC. All rights reserved.</div>
          <div className="footer-meta">Elevare for iOS &amp; Android - Coming Soon</div>
        </div>

        <nav className="footer-links" aria-label="Footer">
          <Link href="/calculators/">Tools</Link>
          <Link href="/exercises/">Exercises</Link>
          <Link href="/workouts/">Workouts</Link>
          <Link href="/nutrition/">Nutrition</Link>
          <Link href="/apps/">Apps</Link>
          <Link href="/shop/">Shop</Link>
          <Link href="/blog/">Blog</Link>
          <Link href="/professionals/">Find Support</Link>
          <AuthNavigationLink />
          <a href="/privacy-policy/">Privacy Policy</a>
          <a href="/terms-of-service/">Terms of Service</a>
          <a href={`mailto:${siteConfig.contacts.support}`}>Contact</a>
        </nav>
      </div>
    </footer>
  );
}
