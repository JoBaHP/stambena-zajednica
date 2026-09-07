import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Пастерова 16 — Стамбена заједница",
    short_name: "Пастерова 16",
    description:
      "Портал стамбене заједнице Пастерова 16: финансије, обавештења, гласања, захтеви, календар и дигитална архива.",
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
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
