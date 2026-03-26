import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "./packages/transactional",
    "./packages/transactional/emails",
  ],

  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        {
          source: "/api/__clerk/:path*",
          destination: "/api/__clerk/:path*", // Let Next.js handle Clerk proxy
        },
      ],
      fallback: [
        {
          source: "/api/:path*",
          destination: "http://127.0.0.1:4000/:path*", // Proxy to Encore
        },
      ],
    };
  },
};

export default nextConfig;
