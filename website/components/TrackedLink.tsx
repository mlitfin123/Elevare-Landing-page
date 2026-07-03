"use client";

import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
import { trackEvent, type AnalyticsEventParams } from "@/lib/analytics";
import { normalizeSitePath } from "@/lib/site";

type TrackedLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  prefetch?: boolean;
  eventName?: string;
  eventParams?: AnalyticsEventParams;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function TrackedLink({
  href,
  children,
  className,
  prefetch,
  eventName,
  eventParams,
  onClick,
}: TrackedLinkProps) {
  const normalizedHref = href.startsWith("/") ? normalizeSitePath(href) : href;

  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    onClick?.(event);

    if (event.defaultPrevented || !eventName) {
      return;
    }

    trackEvent(eventName, {
      ...eventParams,
      destination_url: normalizedHref,
    });
  };

  return (
    <Link href={normalizedHref} className={className} prefetch={prefetch} onClick={handleClick}>
      {children}
    </Link>
  );
}
