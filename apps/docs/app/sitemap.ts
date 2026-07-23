import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/metadata";

export const url = (path: string): string => new URL(path, baseUrl).toString();

/**
 * Only the landing page.
 *
 * The documentation pages used to be listed here. They are gone from this
 * sitemap because every `/docs/**` path on this host is now a permanent
 * redirect to zanreal.com (see `next.config.mjs`), and a sitemap is a list of
 * URLs a crawler is asked to index. Advertising a redirect chain is the one
 * thing that reliably slows consolidation down: the crawler spends its budget
 * rediscovering that each URL has moved, instead of on the destination. The
 * pages are listed in the sitemap of the site that now serves them.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: url("/"),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
