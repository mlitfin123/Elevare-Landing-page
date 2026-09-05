"use client";

import Link from "next/link";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

type AuthNavigationLinkProps = {
  className?: string;
  signedInLabel?: string;
  signInLabel?: string;
  signInHref?: string;
  hrefLang?: string;
};

export function AuthNavigationLink({
  className,
  signedInLabel = "Signed In",
  signInLabel = "Sign In",
  signInHref = "/sign-in/",
  hrefLang,
}: AuthNavigationLinkProps) {
  const { user } = useSupabaseSession();

  return (
    <Link className={className} href={user ? "/account/" : signInHref} hrefLang={hrefLang}>
      {user ? signedInLabel : signInLabel}
    </Link>
  );
}
