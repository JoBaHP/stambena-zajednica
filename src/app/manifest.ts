import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pasterova 16 — Stambena Zajednica",
    short_name: "Pasterova 16",
    description:
      "Portal stambene zajednice Pasterova 16: finansije, obavestenja, glasanja, zahtevi, kalendar i digitalna arhiva.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1e3a8a",
    lang: "sr-RS",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
