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
    return [
      {
        source: "/docs",
        destination: "/docs/2.0",
        permanent: process.env.NODE_ENV === "production",
      },
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
