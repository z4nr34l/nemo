import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/metadata";
import { source } from "@/app/source";

export const url = (path: string): string => new URL(path, baseUrl).toString();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: url("/"),
      changeFrequency: "monthly",
      priority: 1,
    },
    ...source.getPages().map<MetadataRoute.Sitemap[number]>((page) => ({
      url: url(page.url),
      lastModified: page.data.lastModified
        ? new Date(page.data.lastModified)
        : undefined,
      changeFrequency: "weekly",
      priority: 0.5,
    })),
  ];
}
