import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone", // Disabled for local dev - re-enable for Vercel/Docker deploy
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  allowedDevOrigins: [
    '.space.chatglm.site',
    '.space-z.ai',
  ],
};

export default nextConfig;
