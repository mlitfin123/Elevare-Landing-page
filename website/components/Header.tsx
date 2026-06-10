import Image from "next/image";
import Link from "next/link";

const navigation = [
  { href: "/apps", label: "Apps" },
  { href: "/tools", label: "Tools" },
  { href: "/#benefits", label: "Benefits" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#trust", label: "Trust" },
  { href: "/blog", label: "Insights" },
];

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark" aria-hidden="true">
            <Image
              className="brand-mark-image"
              src="/logo_transparent.png"
              alt=""
              width={34}
              height={34}
              priority
            />
          </span>
          <span className="brand-copy">
            <span className="brand-word">Elevare</span>
            <span className="brand-sub">Founding Waitlist</span>
          </span>
        </Link>

        <nav className="header-nav" aria-label="Primary">
          {navigation.map((item) => (
            <Link key={item.href} className="nav-link" href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link className="button-link" href="/#waitlist">
            Join Waitlist
          </Link>
        </nav>
      </div>
    </header>
  );
}
