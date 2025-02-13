import "./global.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { RootProvider } from "fumadocs-ui/provider";
import { baseUrl, createMetadata } from "@/lib/metadata";
import Script from "next/script";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#171717" },
    { media: "(prefers-color-scheme: light)", color: "#fff" },
  ],
};

export const metadata = createMetadata({
  title: {
    template: "%s | NEMO",
    default: "NEMO - Next.js Easy Middleware",
  },
  description:
    "The Next.js library for building clean and performant middlewares.",
  metadataBase: baseUrl,
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(
        GeistSans.variable,
        GeistMono.variable,
        "antialiased font-sans"
      )}
      suppressHydrationWarning
    >
      <body>
        <RootProvider
          search={{
            options: {
              type: "static",
            },
          }}
        >
          {children}
        </RootProvider>
        <Analytics />
        {process.env.NEXT_PUBLIC_ANALYTICS_TOKEN && (
          <Script
            src="https://cdn.rscl.it/ra.js?ver=1.0.2"
            data-token={process.env.NEXT_PUBLIC_ANALYTICS_TOKEN}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
