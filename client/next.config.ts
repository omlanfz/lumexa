import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        // Neon / any other CDN you add later
        protocol: "https",
        hostname: "*.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
  // /courses was renamed to /programs; keep old links and bookmarks working.
  async redirects() {
    return [{ source: "/courses", destination: "/programs", permanent: true }];
  },
  // Suppress build warnings from packages using older React patterns
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3001"],
    },
  },
};

export default nextConfig;
