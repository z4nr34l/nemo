import { DocsLayout } from 'next-docs-ui/layout';
import { type ReactNode } from 'react';
import { tree } from '../source';

export default function RootDocsLayout({ children }: { children: ReactNode }) {
  return (
    // @ts-ignore
    <DocsLayout
      tree={tree}
      nav={{
        title: 'Next Easy Middlewares',
        githubUrl: 'https://github.com/z4nr34l/next-easy-middlewares',
      }}
      sidebar={{
        collapsible: false,
      }}
    >
      {/* @ts-ignore */}
      {children}
    </DocsLayout>
  );
}
