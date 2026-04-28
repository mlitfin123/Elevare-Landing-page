import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-shell">
        <div className="footer-row">
          <div className="footer-copy">
            &copy; {new Date().getFullYear()} Elevare Fit LLC. Performance products for training,
            prep, and coaching.
          </div>

          <nav className="footer-nav" aria-label="Footer">
            <Link href="/apps">Apps</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/logbook">Logbook</Link>
            <Link href="/stagelab">StageLab</Link>
            <Link href="/elevare">Elevare</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
