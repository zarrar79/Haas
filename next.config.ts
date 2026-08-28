import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow opening the dev server via the machine IP (not only localhost).
  // Without this, Next blocks /_next/* JS and the login form never hydrates.
  allowedDevOrigins: ["192.168.3.45"],
};

export default nextConfig;
