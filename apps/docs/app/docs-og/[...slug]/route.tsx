import { generateOGImage } from "fumadocs-ui/og";
import { metadataImage } from "@/lib/metadata";

export const GET = metadataImage.createAPI((page) => {
  return generateOGImage({
    title: page.data.title,
    description: page.data.description,
    site: "Rescale / NEMO",
    primaryColor: "rgba(138,44,226,0.75)",
    primaryTextColor: "#FFFFFF",
  });
});

export function generateStaticParams() {
  return metadataImage.generateParams();
}
