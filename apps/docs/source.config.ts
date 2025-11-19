import {
  transformerMetaWordHighlight,
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
} from "@shikijs/transformers";
import {
  rehypeCodeDefaultOptions,
  RehypeCodeOptions,
  remarkImage,
  remarkStructure,
} from "fumadocs-core/mdx-plugins";
import { remarkInstall } from "fumadocs-docgen";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { transformerTwoslash } from "fumadocs-twoslash";

export const { docs, meta } = defineDocs({
  dir: "content",
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkInstall, remarkImage, remarkStructure],
    rehypeCodeOptions: {
      ...rehypeCodeDefaultOptions,
      lazy: false, // Disable lazy loading to ensure all languages are available
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers as never),
        transformerTwoslash(),
        transformerNotationHighlight(),
        transformerNotationDiff(),
        transformerNotationFocus(),
        transformerNotationErrorLevel(),
        transformerMetaWordHighlight(),
      ],
    } as RehypeCodeOptions,
  },
});
