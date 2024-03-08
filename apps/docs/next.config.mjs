import createMDX from 'fumadocs-mdx/config';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  eslint: {
    // Replaced by root workspace command
    ignoreDuringBuilds: true,
  },
};

export default withMDX(config);
