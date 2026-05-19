import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
  ],
};

export default nextConfig;
