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

export const metadata: Metadata = {
  title: "Atlas",
  description: "Project Management Dashboard",
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
