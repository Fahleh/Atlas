import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/providers/ThemeContext";
import { TRUSTED_TYPES_CHUNK_URL_SOURCE } from "@/lib/trustedTypesChunkUrlPattern";
import "../styles/global.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const isDev = process.env.NODE_ENV === "development";

// Dev-only derivation, not always-from-env: see docs/decisions.md
// ("Deriving SUPABASE_ORIGIN from env in dev only"), same pattern.
const BASE_URL =
  isDev && process.env.NEXT_PUBLIC_BASE_URL
    ? process.env.NEXT_PUBLIC_BASE_URL
    : "https://atlas-murex-nine.vercel.app";

const title = "Atlas";
const description = "Project Management Dashboard";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/",
    images: ["/og/dashboard.png"],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og/dashboard.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const chunkUrlPatternSource = JSON.stringify(TRUSTED_TYPES_CHUNK_URL_SOURCE);

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Must be registered as "default": Turbopack's own chunk loader
            writes script.src directly, never through a named policy. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if(window.trustedTypes&&window.trustedTypes.createPolicy){window.trustedTypes.createPolicy('default',{createScriptURL:function(u){if(!new RegExp(${chunkUrlPatternSource}).test(u)){throw new TypeError('blocked script url: '+u);}return u;}});}`,
          }}
        />
        {/* Runs before React hydrates to set data-theme without flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('atlas-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}else{var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',d?'dark':'light');}}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
