import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow cross-origin requests from all preview panels
  allowedDevOrigins: [
    "preview-chat-1d9446eb-2ae1-4218-8eb6-ba362e67a6dc.space-z.ai",
    "https://preview-chat-1d9446eb-2ae1-4218-8eb6-ba362e67a6dc.space-z.ai",
    /.+\.space-z\.ai$/,
  ],
};

export default nextConfig;
