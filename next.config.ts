import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const SUPABASE_ORIGIN = "https://hgyygkysbljijxmltbgt.supabase.co";

const CSP_HEADER = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE_ORIGIN}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hgyygkysbljijxmltbgt.supabase.co",
        pathname: "/storage/v1/object/public/avatars/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP_HEADER },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
