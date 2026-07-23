import type { Metadata } from "next/types";

import { source } from "@/app/source";

// Simple metadataImage implementation for fumadocs-core v16 compatibility
export const metadataImage = {
  withImage: (slugs: string[], metadata: Metadata): Metadata => {
    return {
      ...metadata,
      openGraph: {
        ...metadata.openGraph,
        images: [`/docs-og/${slugs.join("/")}`],
      },
      twitter: {
        ...metadata.twitter,
        images: [`/docs-og/${slugs.join("/")}`],
      },
    };
  },
  createAPI: (handler: (page: any) => any) => {
    return async (request: Request, context: { params: Promise<{ slug: string[] }> }) => {
      const params = await context.params;
      const page = source.getPage(params.slug);
      if (!page) {
        return new Response("Not Found", { status: 404 });
      }
      return handler(page);
    };
  },
  generateParams: () => {
    return source.getPages().map((page) => ({
      slug: page.slugs,
    }));
  },
};

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    openGraph: {
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      url: baseUrl.toString(),
      siteName: "NEMO",
      ...override.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      creator: "@z4nr34l",
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      ...override.twitter,
    },
  };
}

/**
 * Where NEMO's documentation is published.
 *
 * The docs moved off this host: `apps/docs/content/` is now built and served by
 * the ZanReal marketing site, and every `/docs/**` path here is a permanent
 * redirect into this URL (see `next.config.mjs`). Link straight to it rather
 * than to a local `/docs` path so readers are not sent through a redirect.
 */
export const docsUrl = "https://zanreal.com/docs/oss/nemo";

/**
 * This site's own origin.
 *
 * Still nemo.zanreal.com: the landing page lives here, and the redirects that
 * keep the old documentation URLs resolving have to be served from the host
 * that owns them. Only the documentation moved.
 */
export const baseUrl =
  process.env.NODE_ENV === "development"
    ? new URL("http://localhost:3000")
    : new URL(`https://nemo.zanreal.com`);
