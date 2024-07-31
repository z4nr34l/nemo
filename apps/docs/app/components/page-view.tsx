import { type ReactElement } from 'react';
import { DocsBody, DocsPage } from 'fumadocs-ui/page';
import { RollButton } from 'fumadocs-ui/components/roll-button';
import { notFound } from 'next/navigation';
import { docs } from '@/app/source';

interface PageViewProps {
  slug: string[];
}

export function PageView({
  slug,
}: Readonly<PageViewProps>): ReactElement | boolean {
  const page = docs.getPage(slug);

  if (!page) {
    notFound();
  }

  const Mdx = page.data.exports.default;

  return (
    <DocsPage
      toc={page.data.exports.toc}
      lastUpdate={page.data.exports.lastModified}
      full={page.data.full}
    >
      <RollButton />
      <DocsBody className="dark:prose-invert">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          {page.data.title}
        </h1>
        <p className="mb-8 text-lg text-muted-foreground">
          {page.data.description}
        </p>
        <Mdx />
      </DocsBody>
    </DocsPage>
  );
}
