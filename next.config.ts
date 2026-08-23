import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB. Client-side compression targets ~300 KB, but
      // allow 4 MB headroom for large source images that compress less aggressively.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
