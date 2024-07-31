import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ReactNode } from 'react';
import { docs } from '@/app/source';
import { PageView } from '@/app/components/page-view';

export const dynamicParams = false;
export const dynamic = 'force-static';

interface Param {
  slug: string[];
}

interface PageProps {
  params: Param;
}

export default function Page({ params }: Readonly<PageProps>): ReactNode {
  return <PageView slug={params.slug} />;
}

export function generateStaticParams(): Param[] {
  return docs
    .getPages()
    .filter((page) => page.slugs.length > 0)
    .map<Param>((page) => ({
      slug: page.slugs,
    }));
}

export function generateMetadata({ params }: { params: Param }): Metadata {
  const page = docs.getPage(params.slug);

  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  } satisfies Metadata;
}
