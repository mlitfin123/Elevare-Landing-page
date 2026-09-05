import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  trailingSlash: true,
  images: {
    unoptimized: true,
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
