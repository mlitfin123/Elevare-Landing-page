import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

const accountLinks = [
  { href: "/account/", label: "Overview" },
  { href: "/account/profile/", label: "Client Profile" },
  { href: "/account/saved/", label: "Saved" },
  { href: "/account/professional-profile/", label: "Public Profile" },
  { href: "/account/inquiries/", label: "Requests" },
];

export default function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="container">
      <section className="hero hero-compact">
        <div className="eyebrow">Account</div>
        <h1>Your Elevare marketplace account.</h1>
        <p>Manage private client preferences, your public profile details, saved profiles, and requests.</p>
      </section>

      <nav className="subnav" aria-label="Account">
        {accountLinks.map((link) => (
          <Link key={link.href} className="subnav-link" href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
