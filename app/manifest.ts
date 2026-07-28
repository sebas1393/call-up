import type { MetadataRoute } from "next";

/**
 * Web App Manifest — Kortumo (Brandbook-KORTUMO).
 * @see https://nextjs.org/docs/app/guides/progressive-web-apps
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kortumo",
    short_name: "Kortumo",
    description:
      "Convocatorias deportivas: crea partidos, suscríbete y recibe avisos.",
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
