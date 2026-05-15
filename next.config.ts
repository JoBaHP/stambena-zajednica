import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;
