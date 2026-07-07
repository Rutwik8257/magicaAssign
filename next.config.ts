import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
