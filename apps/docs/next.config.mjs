import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  compiler: {
    ...(process.env.VERCEL_ENV === "production"
      ? {
        removeConsole: {
          exclude: ["error"],
        },
      }
      : {}),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.zanreal.com",
        pathname: "/public/**",
      },
    ],
  },
  redirects: () => {
    const permanent = process.env.NODE_ENV === "production";

    return [
      { source: "/docs", destination: "/docs/v3", permanent },
      // Version folders were renamed to majors (1.4 -> v1, 2.0 -> v2), so the
      // old paths must keep resolving: /docs/2.0/migration is carried in the
      // npm deprecation metadata of @rescale/nemo, which is immutable, and the
      // published package READMEs point at /docs/2.0/* too.
      //
      // The stewardship rule comes first because that page MOVED to v3 - the
      // generic /docs/2.0/:path* rule below would otherwise send it to
      // /docs/v2/stewardship, which no longer exists.
      {
        source: "/docs/2.0/stewardship",
        destination: "/docs/v3/stewardship",
        permanent,
      },
      { source: "/docs/2.0/:path*", destination: "/docs/v2/:path*", permanent },
      { source: "/docs/1.4/:path*", destination: "/docs/v1/:path*", permanent },
      { source: "/docs/2.0", destination: "/docs/v2", permanent },
      { source: "/docs/1.4", destination: "/docs/v1", permanent },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default withMDX(config);
