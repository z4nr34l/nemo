import { source } from "@/app/source";
import { remark } from "remark";

export const revalidate = false;

export async function GET() {
  const pages = source.getPages();

  const scan = pages.map(async (page) => {
    const pageData = page.data as {
      lastModified?: Date | string;
      structuredData?: any;
      toc?: any[];
      title?: string;
      description?: string;
      icon?: string;
    };
    const { lastModified, structuredData, toc, title, description, icon } =
      pageData;
    const processed = await processContent(
      structuredData?.contents?.map((item: any) => item.content).join("\n\n") ?? "",
    );

    return `file: ${(page as any).file?.flattenedPath ?? page.url}
meta: ${JSON.stringify(
      {
        lastModified,
        structuredData,
        toc,
        title,
        description,
        icon,
      },
      null,
      2,
    )}
        
${processed}`;
  });

  const scanned = await Promise.all(scan);

  return new Response(scanned.join("\n\n"));
}

async function processContent(content: string): Promise<string> {
  const file = await remark().process(content);

  return String(file);
}
