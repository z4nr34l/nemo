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
  redirects: () => {
    return [
      {
        source: "/docs",
        destination: "/docs/2.0.0",
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
