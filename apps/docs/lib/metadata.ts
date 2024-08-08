import type { Metadata } from 'next/types';

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    openGraph: {
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      url: 'https://nemo.rscl.it',
      siteName: 'NEMO',
      ...override.openGraph,
    },
    twitter: {
      card: 'summary_large_image',
      creator: '@z4nr34l',
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      ...override.twitter,
    },
  };
}

export const baseUrl =
  process.env.NODE_ENV === 'development'
    ? new URL('http://localhost:3000')
    : new URL(`https://nemo.rescale.build`);
