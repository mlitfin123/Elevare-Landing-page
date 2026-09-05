"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthNavigationLink } from "@/components/AuthNavigationLink";
import { TranslationFeedback } from "@/components/localization/TranslationFeedback";
import { localeFromPathname, localizePathname } from "@/lib/i18n/config";
import { getShellMessages } from "@/lib/i18n/shell-messages";
import { siteConfig } from "@/lib/site";

export function Footer() {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const messages = getShellMessages(locale);
  const signInHref = `/sign-in/?redirect=${encodeURIComponent(localizePathname("/", locale))}`;
  const englishOnlyHrefLang = locale === "en" ? undefined : "en";

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <div className="footer-copy">&copy; {new Date().getFullYear()} Elevare Fit LLC. {messages.footer.rights}</div>
          <div className="footer-meta">{messages.footer.mobileComingSoon}</div>
        </div>

        <nav className="footer-links" aria-label={messages.footerNavigationLabel}>
          <Link href="/calculators/" hrefLang={englishOnlyHrefLang}>{messages.navigation.tools}</Link>
          <Link href="/exercises/" hrefLang={englishOnlyHrefLang}>{messages.navigation.exercises}</Link>
          <Link href="/workouts/" hrefLang={englishOnlyHrefLang}>{messages.navigation.workouts}</Link>
          <Link href="/nutrition/" hrefLang={englishOnlyHrefLang}>{messages.navigation.nutrition}</Link>
          <Link href="/apps/" hrefLang={englishOnlyHrefLang}>{messages.navigation.apps}</Link>
          <Link href="/shop/" hrefLang={englishOnlyHrefLang}>{messages.navigation.shop}</Link>
          <Link href="/blog/" hrefLang={englishOnlyHrefLang}>{messages.navigation.blog}</Link>
          <Link href="/professionals/" hrefLang={englishOnlyHrefLang}>{messages.navigation.findSupport}</Link>
          <AuthNavigationLink
            signedInLabel={messages.authentication.signedIn}
            signInLabel={messages.authentication.signIn}
            signInHref={signInHref}
            hrefLang={englishOnlyHrefLang}
          />
          {/* Static legal documents intentionally use full browser navigation. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/privacy-policy/" hrefLang="en">{messages.footer.privacyPolicyEnglish}</a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/terms-of-service/" hrefLang="en">{messages.footer.termsEnglish}</a>
          <a href={`mailto:${siteConfig.contacts.support}`}>{messages.footer.contact}</a>
          <TranslationFeedback
            locale={locale}
            pathname={pathname}
            messages={messages.translationFeedback}
          />
        </nav>
      </div>
    </footer>
  );
}
