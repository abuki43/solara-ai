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
        source: "/api/livekit/:path*",
        destination: `${serverUrl}/api/livekit/:path*`,
      },
      {
        source: "/api/files/:path*",
        destination: `${serverUrl}/api/files/:path*`,
      },
      {
        source: "/api/voice/:path*",
        destination: `${serverUrl}/api/voice/:path*`,
      },
      {
        source: "/trpc/:path*",
        destination: `${serverUrl}/trpc/:path*`,
      },
    ];
  },
};

export default nextConfig;
