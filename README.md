# next-easy-middlewares

`next-easy-middlewares` is a simple utility for creating path-based middleware in Next.js applications. Simplify multi-middleware management in few easy steps.

## Installation

```bash
npm install next-easy-middlewares
```

```bash
pnpm add next-easy-middlewares
```

```bash
bun add next-easy-middlewares
```

## Usage

`/middleware.ts`

```ts
import { createMiddleware } from 'next-easy-middlewares';
import { type NextRequest, NextResponse } from 'next/server';

// Define your middleware functions
const blogMiddleware = async (request: NextRequest): Promise<NextResponse> => {
  // Your blog-specific logic here
  console.log('Blog middleware');
  return NextResponse.next();
};

const docsMiddleware = async (request: NextRequest): Promise<NextResponse> => {
  // Your docs-specific logic here
  console.log('Docs middleware');
  return NextResponse.next();
};

// Create path-based middleware
export const middleware = createMiddleware({
  '/blog': blogMiddleware,
  '/docs': docsMiddleware,
  '/docs/:path*': docsMiddleware,
});

export const config = {
  /*
   * Match all paths except for:
   * 1. /api/ routes
   * 2. /_next/ (Next.js internals)
   * 3. /_static (inside /public)
   * 4. /_vercel (Vercel internals)
   * 5. Static files (e.g. /favicon.ico, /sitemap.xml, /robots.txt, etc.)
   */
  matcher: ['/((?!api/|_next/|_static|_vercel|[\\w-]+\\.\\w+).*)'],
};
```

## Explanation

When you are defining middlewares, there is small difference in key definition: `:path*`, which includes all sub-paths as well.

```ts
export const middleware = createMiddleware({
  '/blog': blogMiddleware,
  '/docs': docsMiddleware,
  '/docs/:path*': docsMiddleware,
});
```

In this example middleware would be executed for paths:

- `/blog`
- `/docs`
- `/docs/*`

Hope it will save you some time and would make your project DX better!
