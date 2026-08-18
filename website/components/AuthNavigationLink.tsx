"use client";

import Link from "next/link";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

type AuthNavigationLinkProps = {
  className?: string;
};

export function AuthNavigationLink({ className }: AuthNavigationLinkProps) {
  const { user } = useSupabaseSession();

  return (
    <Link className={className} href={user ? "/account/" : "/sign-in/"}>
      {user ? "Signed In" : "Sign In"}
    </Link>
  );
}
