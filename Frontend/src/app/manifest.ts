import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BAI APP",
    short_name: "BAI APP",
    description:
      "Broker-led loan preparation and live tracking for Philippines and Australia.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FAFAFA",
    theme_color: "#0A2881",
    related_applications: [
      {
        platform: "webapp",
        url: "/manifest.webmanifest",
      },
    ],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
