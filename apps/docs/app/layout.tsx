import './global.css';
import { RootProvider } from 'next-docs-ui/provider';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: 'black',
  colorScheme: 'dark',
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(
        GeistSans.variable,
        GeistMono.variable,
        'antialiased font-sans',
      )}
    >
      <body>
        {/* @ts-ignore */}
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
