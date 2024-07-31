import { type ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layout';
import { docs } from '@/app/source';
import { BookIcon, HomeIcon } from 'lucide-react';

export default function RootDocsLayout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      nav={{
        title: 'next-easy-middlewares',
      }}
      links={[
        {
          icon: <HomeIcon />,
          text: 'Home',
          url: '/',
        },
        {
          icon: <BookIcon />,
          text: 'Docs',
          url: '/docs',
          active: 'nested-url',
        },
      ]}
      tree={docs.pageTree as never}
    >
      {children}
    </DocsLayout>
  );
}
