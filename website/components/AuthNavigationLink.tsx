"use client";

import Link from "next/link";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

type AuthNavigationLinkProps = {
  className?: string;
  signedInLabel?: string;
  signInLabel?: string;
  signInHref?: string;
  signedInHref?: string;
  hrefLang?: string;
};

export function AuthNavigationLink({
  className,
  signedInLabel = "Signed In",
  signInLabel = "Sign In",
  signInHref = "/sign-in/",
  signedInHref = "/account/",
  hrefLang,
}: AuthNavigationLinkProps) {
  const { user } = useSupabaseSession();

  return (
    <Link className={className} href={user ? signedInHref : signInHref} hrefLang={hrefLang}>
      {user ? signedInLabel : signInLabel}
    </Link>
  );
}
