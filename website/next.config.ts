import { LOCALIZED_LEGAL_PATHS } from "./lib/legal-localization-routes";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  async redirects() {
    return ["", "/es", "/pt-br"].flatMap((prefix) => LOCALIZED_LEGAL_PATHS.map((route) => ({
      source: `${prefix}${route.slice(0, -1)}.html`, destination: `${prefix}${route}`, permanent: true,
    })));
  },
  async headers() {
    return [
      {
        source: "/es/:path*",
        headers: [{ key: "Content-Language", value: "es-419" }],
      },
      {
        source: "/pt-br/:path*",
        headers: [{ key: "Content-Language", value: "pt-BR" }],
      },
    ];
  },
};

export default nextConfig;
