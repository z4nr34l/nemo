import { pageTree } from '../source';
import { DocsLayout } from 'fumadocs-ui/layout';
import type { ReactNode } from 'react';

export default function RootDocsLayout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={pageTree}
      nav={{
        title: 'Next Easy Middlewares',
        githubUrl: 'https://github.com/z4nr34l/next-easy-middlewares',
      }}
    >
      {children}
    </DocsLayout>
  );
}
