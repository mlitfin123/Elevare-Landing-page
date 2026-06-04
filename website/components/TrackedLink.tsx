"use client";

import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
import { trackEvent, type AnalyticsEventParams } from "@/lib/analytics";

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
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    onClick?.(event);

    if (event.defaultPrevented || !eventName) {
      return;
    }

    trackEvent(eventName, {
      ...eventParams,
      destination_url: href,
    });
  };

  return (
    <Link href={href} className={className} prefetch={prefetch} onClick={handleClick}>
      {children}
    </Link>
  );
}
