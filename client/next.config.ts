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
  // The video effects' models and runtime are big and never change under the same URL
  // (the runtime is under its version number; the models are pinned): let browsers and
  // the CDN keep them.
  async headers() {
    return [
      { source: '/mediapipe/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/models/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
    ];
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
