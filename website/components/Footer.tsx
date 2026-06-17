import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <div className="footer-copy">&copy; {new Date().getFullYear()} Elevare. All rights reserved.</div>
          <div className="footer-meta">Elevare Fit LLC</div>
        </div>

        <nav className="footer-links" aria-label="Footer">
          <Link href="/apps">Apps</Link>
          <Link href="/calculators">Tools</Link>
          <Link href="/tools/workout-generator">Workout Finder</Link>
          <Link href="/nutrition">Nutrition</Link>
          <Link href="/exercises">Exercises</Link>
          <Link href="/workouts">Workouts</Link>
          <Link href="/blog">Insights</Link>
          <Link href="/#benefits">Benefits</Link>
          <Link href="/#how-it-works">How It Works</Link>
          <Link href="/privacy-policy.html">Privacy Policy</Link>
          <Link href="/terms-of-service.html">Terms of Service</Link>
          <a href="mailto:mlitfin@elevarefit.org">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
