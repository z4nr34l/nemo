import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { docs } from '@/app/source';
import { PageView } from '@/components/ui/page-view';

export const dynamicParams = false;
export const dynamic = 'force-static';

interface Param {
  slug: string[];
}

interface PageProps {
  params: Promise<Param>;
}

export default async function Page({
  params,
}: Readonly<PageProps>): Promise<React.ReactNode> {
  return <PageView slug={(await params).slug} />;
}

export function generateStaticParams(): Param[] {
  return docs
    .getPages()
    .filter((page) => page.slugs.length > 0)
    .map<Param>((page) => ({
      slug: page.slugs,
    }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Param>;
}): Promise<Metadata> {
  const page = docs.getPage((await params).slug);

  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  } satisfies Metadata;
}
