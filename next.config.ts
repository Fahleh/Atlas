import type { NextConfig } from "next";
import { SKELETON_STYLE_HASHES } from "./scripts/generate-skeleton-hashes.mjs";
import { buildCsp } from "@/lib/csp";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hgyygkysbljijxmltbgt.supabase.co",
        pathname: "/storage/v1/object/public/avatars/**",
      },
      ...(isDev
        ? [
            {
              protocol: "https" as const,
              hostname: "xjeuplmaedethwrikjag.supabase.co",
              pathname: "/storage/v1/object/public/avatars/**",
            },
          ]
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: buildCsp(SKELETON_STYLE_HASHES) },
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
