import { baseUrl, createMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/react";
import { Banner } from "fumadocs-ui/components/banner";
import { RootProvider } from "fumadocs-ui/provider";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Viewport } from "next";
import type { ReactNode } from "react";
import "./global.css";

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
        "antialiased font-sans",
      )}
      suppressHydrationWarning
    >
      <body>
        {process.env.NEXT_PUBLIC_VERCEL_ENV !== "production" && (
          <Banner variant="rainbow">
            This is `canary` version of documentation. It&apos;s still under
            construction and review.
          </Banner>
        )}
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
      </body>
    </html>
  );
}
