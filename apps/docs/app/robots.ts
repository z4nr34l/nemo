import { type MetadataRoute } from "next";
import { url } from "@/app/sitemap";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: url("/sitemap"),
  };
}
