"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AuthNavigationLink } from "@/components/AuthNavigationLink";
import { TranslationFeedback } from "@/components/localization/TranslationFeedback";
import { localeFromPathname, localizePathname } from "@/lib/i18n/config";
import { getShellMessages } from "@/lib/i18n/shell-messages";
import { marketplaceText } from "@/lib/i18n/marketplace-content";
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
          <nav className="footer-socials" aria-label="Instagram">
            <a href="https://www.instagram.com/elevare.connect/" target="_blank" rel="noopener noreferrer" aria-label="Elevare Instagram (@elevare.connect)">
              <Image src="/instagram-icon.png" width={26} height={26} alt="" aria-hidden="true" />
              <span>Elevare</span>
            </a>
            <a href="https://www.instagram.com/stagelabprep/" target="_blank" rel="noopener noreferrer" aria-label="StageLab Instagram (@stagelabprep)">
              <Image src="/instagram-icon.png" width={26} height={26} alt="" aria-hidden="true" />
              <span>StageLab</span>
            </a>
          </nav>
        </div>

        <nav className="footer-links" aria-label={messages.footerNavigationLabel}>
          <Link href={localizePathname("/calculators/", locale)}>{messages.navigation.tools}</Link>
          <Link href={localizePathname("/exercises/", locale)}>{messages.navigation.exercises}</Link>
          <Link href={localizePathname("/workouts/", locale)}>{messages.navigation.workouts}</Link>
          <Link href={localizePathname("/nutrition/", locale)}>{messages.navigation.nutrition}</Link>
          <Link href="/apps/" hrefLang={englishOnlyHrefLang}>{messages.navigation.apps}</Link>
          <Link href="/shop/" hrefLang={englishOnlyHrefLang}>{messages.navigation.shop}</Link>
          <Link href="/blog/" hrefLang={englishOnlyHrefLang}>{messages.navigation.blog}</Link>
          <Link href={localizePathname("/professionals/", locale)}>{messages.navigation.findSupport}</Link>
          <Link href={localizePathname("/trust-safety/", locale)}>{marketplaceText(locale, "Trust and Safety")}</Link>
          <AuthNavigationLink
            signedInLabel={messages.authentication.signedIn}
            signInLabel={messages.authentication.signIn}
            signInHref={signInHref}
            signedInHref={localizePathname("/account/", locale)}
            hrefLang={undefined}
          />
          {/* Static legal documents intentionally use full browser navigation. */}
          <a href={localizePathname("/privacy-policy/", locale)} hrefLang={locale}>{messages.footer.privacyPolicyEnglish}</a>
          <a href={localizePathname("/terms-of-service/", locale)} hrefLang={locale}>{messages.footer.termsEnglish}</a>
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
