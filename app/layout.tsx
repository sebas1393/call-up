import type { Metadata } from "next";
import { Montserrat, Open_Sans } from "next/font/google";

import { SessionKeepAlive } from "@/components/auth/session-keep-alive";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import "./globals.css";

/** Brandbook stand-ins: titles → Montserrat; body → Open Sans (Aharoni/Myriad pending license). */
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "600", "700"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Kortumo",
  description:
    "Convocatorias deportivas: crea partidos, suscríbete y recibe avisos.",
  applicationName: "Kortumo",
  appleWebApp: {
    capable: true,
    title: "Kortumo",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${openSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SessionKeepAlive />
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
