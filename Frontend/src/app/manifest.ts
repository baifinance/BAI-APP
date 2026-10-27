import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BAI Finance",
    short_name: "BAI Finance",
    description:
      "Broker-led loan preparation and live tracking for Philippines and Australia.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FAFAFA",
    theme_color: "#0A2881",
    icons: [
      {
        src: "/bai_logo_blue.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
