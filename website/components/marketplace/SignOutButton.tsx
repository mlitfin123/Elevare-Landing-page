"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { localeFromPathname, localizePathname } from "@/lib/i18n/config";
import { marketplaceText } from "@/lib/i18n/marketplace-content";

export function SignOutButton() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    setIsSubmitting(true);

    try {
      await supabase.auth.signOut();
      router.push(localizePathname("/professionals/", locale));
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button type="button" className="button button-secondary" onClick={handleSignOut} disabled={isSubmitting}>
      {marketplaceText(locale, isSubmitting ? "Logging out..." : "Log out")}
    </button>
  );
}
