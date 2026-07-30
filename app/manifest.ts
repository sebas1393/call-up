import type { MetadataRoute } from "next";

/**
 * Web App Manifest — Kall-UP.
 * @see https://nextjs.org/docs/app/guides/progressive-web-apps
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kall-UP",
    short_name: "Kall-UP",
    description:
      "Convocatorias deportivas: crea partidos, suscríbete y recibe avisos.",
    // Home landing (US-001). Ready callers are redirected client-side to `/caller`.
    // Do NOT start at `/caller` — that forced Google login for anon/PWA open.
    start_url: "/",
    display: "standalone",
    background_color: "#003366",
    theme_color: "#003366",
    lang: "es-CO",
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
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
