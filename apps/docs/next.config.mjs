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
        source: "/sitemap.xml",
        destination: "/sitemap",
        permanent: true,
      },
    ];
  },
};

export default withMDX(config);
