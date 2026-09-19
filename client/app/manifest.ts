import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lumexa · Live AI Tutoring",
    short_name: "Lumexa",
    description:
      "Connect with expert teachers for live one-on-one tutoring sessions.",
    start_url: "/",
    display: "standalone",
    background_color: "#08090F",
    theme_color: "#2DD4BF",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
