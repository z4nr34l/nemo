import type { ReactNode } from "react";

/**
 * The documentation now lives at https://zanreal.com/docs/oss/nemo.
 *
 * This app exists only to serve the redirect table in `next.config.mjs`, which
 * keeps every previously published URL resolving - including the ones carried
 * in immutable npm metadata. Next.js still requires a root layout and a page
 * for the build to succeed, so these two files are the whole application.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
