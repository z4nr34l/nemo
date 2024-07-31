import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ReactNode } from 'react';
import { docs } from '@/app/source';
import { PageView } from '@/components/ui/page-view';

export const dynamicParams = false;

export default function Page(): ReactNode {
  return <PageView slug={[]} />;
}

export function generateMetadata(): Metadata {
  const page = docs.getPage([]);

  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  } satisfies Metadata;
}
