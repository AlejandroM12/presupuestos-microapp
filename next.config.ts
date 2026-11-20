import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const PIXEL_SCRIPTS =
  "https://connect.facebook.net https://analytics.tiktok.com https://www.googletagmanager.com";
const PIXEL_IMAGES =
  "https://www.facebook.com https://analytics.tiktok.com https://www.google-analytics.com https://www.googletagmanager.com";
const PIXEL_CONNECT = [
  "https://www.facebook.com",
  "https://connect.facebook.net",
  "https://analytics.tiktok.com",
  "https://analytics-ipv6.tiktokw.com",
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://www.googletagmanager.com",
].join(" ");

// Next.js inyecta scripts en línea; sin nonces por solicitud se permite 'unsafe-inline'.
// El resto de la política es estricta (mismo origen, sin frames, sin plugins).
const csp = [
  "default-src 'self'",
  // Los dominios de píxeles publicitarios solo se usan si se configuran sus identificadores y la
  // persona acepta las cookies de medición (ver src/lib/analytics). Sin eso no se cargan.
  `script-src 'self' 'unsafe-inline' ${PIXEL_SCRIPTS}${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${PIXEL_IMAGES}`,
  "font-src 'self' data:",
  `connect-src 'self' ${PIXEL_CONNECT}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  serverExternalPackages: ["@react-pdf/renderer"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
