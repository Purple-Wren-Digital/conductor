import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "./packages/transactional",
    "./packages/transactional/emails",
  ],

  async rewrites() {
    return [
      {
        source: "/api/((?!__clerk).*)",
        destination: "http://127.0.0.1:4000/:path*", // Proxy to Encore
      },
    ];
  },
};

export default nextConfig;
