import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@mastra/core",
    "@mastra/lance",
    "@lancedb/lancedb",
    "sharp",
    "@prisma/client",
    "@xenova/transformers",
  ],
};

export default nextConfig;
