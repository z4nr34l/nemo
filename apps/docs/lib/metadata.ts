import type { Metadata } from "next/types";

import { createMetadataImage } from "fumadocs-core/server";
import { source } from "@/app/source";

export const metadataImage = createMetadataImage({
  imageRoute: "/docs-og",
  source,
});

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    openGraph: {
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      url: "https://nemo.rescale.build",
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

export const baseUrl =
  process.env.NODE_ENV === "development"
    ? new URL("http://localhost:3000")
    : new URL(`https://nemo.rescale.build`);
