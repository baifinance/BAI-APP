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
        src: "/bai-favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
        purpose: "any",
      },
      {
        src: "/bai-favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
        purpose: "maskable",
      },
    ],
  };
}
