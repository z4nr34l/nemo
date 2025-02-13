import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { remarkInstall } from "fumadocs-docgen";
import {
  rehypeCodeDefaultOptions,
  RehypeCodeOptions,
  remarkImage,
  remarkStructure,
} from "fumadocs-core/mdx-plugins";
import { transformerTwoslash } from "fumadocs-twoslash";
import {
  transformerMetaWordHighlight,
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
} from "@shikijs/transformers";

export const { docs, meta } = defineDocs();

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkInstall, remarkImage, remarkStructure],
    rehypeCodeOptions: {
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
