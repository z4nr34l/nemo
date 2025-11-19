import { docs, meta } from "@/.source/server";
import { create } from "@/components/icon";
import { loader } from "fumadocs-core/source";
import { icons } from "lucide-react";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";

// In v14, docs and meta are async, so we need to await them
const docsCollection = await docs;
const metaCollection = await meta;

// Use toFumadocsSource to convert collections to source format
const sourceData = toFumadocsSource(docsCollection, metaCollection);

export const source = loader({
  baseUrl: "/docs",
  source: sourceData,
  icon(icon) {
    if (icon && icon in icons)
      return create({ icon: icons[icon as keyof typeof icons] });
  },
});
