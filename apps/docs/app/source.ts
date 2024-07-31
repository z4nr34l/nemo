import type { InferPageType } from 'fumadocs-core/source';
import { loader } from 'fumadocs-core/source';
import { createMDXSource, defaultSchemas } from 'fumadocs-mdx';
import { icons } from 'lucide-react';
import { z } from 'zod';
import { map } from './../.map';
import { create } from './components/icon';

export const docs = loader({
  baseUrl: '/docs',
  rootDir: 'docs',
  icon(icon) {
    if (icon && icon in icons)
      return create({ icon: icons[icon as keyof typeof icons] });
  },
  source: createMDXSource(map, {
    // @ts-expect-error -- intentional
    frontmatter: defaultSchemas.frontmatter.extend({
      toc: z.boolean().default(true),
      index: z.boolean().default(false),
    }) as never,
  }),
});

export type Doc = InferPageType<typeof docs>;
