import createMDX from 'fumadocs-mdx/config';
import {
  rehypeCode,
  rehypeCodeDefaultOptions,
} from 'fumadocs-core/mdx-plugins';
import {
  fileGenerator,
  remarkDocGen,
  remarkInstall,
  typescriptGenerator,
} from 'fumadocs-docgen';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  transformerMetaWordHighlight,
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
} from '@shikijs/transformers';
import { transformerTwoslash } from 'fumadocs-twoslash';

const withMDX = createMDX({
  mdxOptions: {
    rehypeCodeOptions: {
      transformers: [
        ...rehypeCodeDefaultOptions.transformers,
        transformerTwoslash(),
        transformerNotationHighlight(),
        transformerNotationDiff(),
        transformerNotationFocus(),
        transformerNotationErrorLevel(),
        transformerMetaWordHighlight(),
        {
          name: 'fumadocs:remove-escape',
          code(element) {
            element.children.forEach((line) => {
              if (line.type !== 'element') return;

              line.children.forEach((child) => {
                if (child.type !== 'element') return;
                const textNode = child.children[0];
                if (!textNode || textNode.type !== 'text') return;

                textNode.value = textNode.value.replace(/\[\\!code/g, '[!code');
              });
            });

            return element;
          },
        },
      ],
    },
    lastModifiedTime: 'git',
    remarkPlugins: [
      remarkMath,
      [remarkInstall, { Tabs: 'InstallTabs' }],
      [remarkDocGen, { generators: [typescriptGenerator(), fileGenerator()] }],
    ],
    rehypePlugins: (v) => [rehypeKatex, rehypeCode, ...v],
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
};

export default withMDX(config);
