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

// `content/` is no longer read only by this app. It is the source that the
// ZanReal marketing site clones and renders at zanreal.com/docs/oss/nemo, so it
// carries two kinds of file this app cannot render:
//
//   - Polish pages (`*.pl.mdx`, `meta.pl.json`). That site is bilingual and
//     routes them under /pl; this one is English-only, so without the filter
//     fumadocs would publish them as pages literally named `migration.pl`.
//   - The package landing page at the content root (`index.mdx`,
//     `index.pl.mdx` and the root `meta*.json`). It is written against the
//     marketing site's MDX components, which do not exist here.
//
// Everything else - the English pages of every documented major - still
// compiles here, so a malformed page fails this repository's own build rather
// than the next deploy of the site that renders it.
export const docs = defineDocs({
  dir: "content",
  docs: { files: ["**/*.mdx", "!**/*.pl.mdx", "!index.mdx"] },
  meta: { files: ["**/*.json", "!**/*.pl.json", "!meta.json"] },
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
