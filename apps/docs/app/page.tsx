import { ReactElement } from 'react';
import { Hero } from '@/components/homepage/hero';

export default function HomePage(): ReactElement {
  return (
    <main className="relative max-w-5xl mx-auto border my-[150px] bg-background">
      <Hero />
    </main>
  );
}
