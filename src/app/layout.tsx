import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist_Mono, Inter } from "next/font/google";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { siteConfig } from "@/lib/config/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const display = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const title = "Creá presupuestos profesionales en minutos | AtajoLab Presupuestos";
const ogImage = { url: "/og/presupuestos.png", width: 1200, height: 630, alt: siteConfig.name };

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: title, template: "%s · AtajoLab Presupuestos" },
  description: siteConfig.tagline,
  applicationName: siteConfig.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: siteConfig.name,
    title,
    description: siteConfig.tagline,
    url: "/",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: siteConfig.tagline,
    images: [ogImage.url],
  },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = { themeColor: "#14213d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es-AR"
      className={`${inter.variable} ${display.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <AnalyticsProvider />
      </body>
    </html>
  );
}
