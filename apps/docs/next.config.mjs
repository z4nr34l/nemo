import { createMDX } from 'fumadocs-mdx/next';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';
import { transformerTwoslash } from 'fumadocs-twoslash';

const withMDX = createMDX({
  mdxOptions: {
    rehypeCodeOptions: {
      transformers: [
        ...rehypeCodeDefaultOptions.transformers,
        transformerTwoslash(),
      ],
    },
  },
});

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  compiler: {
    ...(process.env.VERCEL_ENV === 'production'
      ? {
          removeConsole: {
            exclude: ['error'],
          },
        }
      : {}),
  },
  redirects: () => {
    return [
      {
        source: '/sitemap.xml',
        destination: '/sitemap',
        permanent: true,
      },
    ];
  },
};

export default withMDX(config);
