import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's generated client ships native/WASM engine files that should be
  // bundled as-is rather than processed by webpack.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
