import createNextDocsMDX from 'next-docs-mdx/config';
import remarkMdxImages from 'remark-mdx-images';
import remarkSmartypants from 'remark-smartypants';

const withFumaMDX = createNextDocsMDX({
  mdxOptions: {
    remarkPlugins: [remarkMdxImages, remarkSmartypants],
  },
});

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
};

export default withFumaMDX(config);
