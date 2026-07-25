import type { NextConfig } from "next";

const serverUrl = process.env.SERVER_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${serverUrl}/api/auth/:path*`,
      },
      {
        source: "/trpc/:path*",
        destination: `${serverUrl}/trpc/:path*`,
      },
    ];
  },
};

export default nextConfig;
