import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BAI APP",
    short_name: "BAI APP",
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
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/bai_logo_blue.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/bai_logo_blue.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/bai_logo_blue.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/calculator_illustration.jpg",
        sizes: "1280x720",
        type: "image/jpeg",
        form_factor: "wide",
        label: "BAI APP loan calculator",
      },
      {
        src: "/loginImage.jpeg",
        sizes: "750x1334",
        type: "image/jpeg",
        form_factor: "narrow",
        label: "BAI APP login",
      },
    ],
  };
}
