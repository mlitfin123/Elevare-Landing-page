import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
