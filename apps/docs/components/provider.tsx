'use client';

import { RootProvider } from 'fumadocs-ui/provider';
import { type ReactNode } from 'react';

interface ProviderProps {
  children: ReactNode;
}

export default function Provider({
  children,
}: Readonly<ProviderProps>): ReactNode {
  return (
    <RootProvider
      search={
        {
          SearchDialog: undefined,
          enabled: false,
        } as never
      }
    >
      {children}
    </RootProvider>
  );
}
