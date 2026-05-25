import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@aufzug/shared"],
  serverExternalPackages: ["sharp"],
  allowedDevOrigins: ["nearest-pantry-bobbed.ngrok-free.dev"],
};

export default nextConfig;
