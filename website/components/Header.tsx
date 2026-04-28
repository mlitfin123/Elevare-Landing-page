import Link from "next/link";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/apps", label: "Apps" },
  { href: "/logbook", label: "Logbook" },
  { href: "/stagelab", label: "StageLab" },
  { href: "/elevare", label: "Elevare" },
  { href: "/blog", label: "Blog" },
];

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" href="/">
          <span className="brand-mark">EF</span>
          <span className="brand-copy">
            <span className="brand-title">Elevare</span>
            <span className="brand-subtitle">Performance ecosystem</span>
          </span>
        </Link>

        <nav className="header-nav" aria-label="Primary">
          {navigation.map((item) => (
            <Link key={item.href} className="nav-link" href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
