import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { remarkInstall } from 'fumadocs-docgen';
import { remarkImage, remarkStructure } from 'fumadocs-core/mdx-plugins';

export const { docs, meta } = defineDocs();

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkInstall, remarkImage, remarkStructure],
  },
});
