import Image from "next/image";
import Link from "next/link";

const navigation = [
  { href: "/calculators/", label: "Tools" },
  { href: "/exercises/", label: "Exercises" },
  { href: "/workouts/", label: "Workouts" },
  { href: "/nutrition/", label: "Nutrition" },
  { href: "/apps/", label: "Apps" },
  { href: "/blog/", label: "Blog" },
  { href: "/#waitlist", label: "Elevare Waitlist" },
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
            <span className="brand-word">ElevareFit</span>
            <span className="brand-sub">Tools, workouts, apps</span>
          </span>
        </Link>

        <nav className="header-nav" aria-label="Primary">
          {navigation.map((item) => (
            <Link key={item.href} className="nav-link" href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link className="button-link" href="/logbook/">
            Get Logbook
          </Link>
        </nav>
      </div>
    </header>
  );
}
