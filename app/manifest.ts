import type { MetadataRoute } from "next";

/**
 * Web App Manifest (Next.js official PWA pattern).
 * @see https://nextjs.org/docs/app/guides/progressive-web-apps
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Call Up",
    short_name: "Call Up",
    description:
      "Convocatorias de fútbol: crea partidos, suscríbete y recibe avisos.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f1a14",
    theme_color: "#1a7f4b",
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
