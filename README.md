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

const blogPostMiddleware = async (
  request: NextRequest,
): Promise<NextResponse> => {
  // Your docs-specific logic here
  console.log('Blog post middleware', request.nextUrl.pathname);
  return NextResponse.next();
};

// Create path-based middleware
export const middleware = createMiddleware({
  // This will match /blog route only
  '/blog': blogMiddleware,
  // This will match /docs route only
  '/docs': docsMiddleware,
  // This will match all routes that are starting with /docs/
  '/docs/:path*': docsMiddleware,
  // This will match all dynamic routes for /blog/[slug], but only them
  '/blog/[slug]': blogMiddleware,
  // This will match all dynamic routes for /blog/[slug]/view, but only them
  // Also you can define middleware logic in-line style
  '/blog/[slug]/view': async (request: NextRequest): Promise<NextResponse> => {
    // Your blog post's view path specific logic here
    console.log('Blog view middleware');
    return NextResponse.next();
  },
  // Matches via regex, in that case only urls that are using numbers after `posts` segment
  // example: /posts/123
  'regex:^/posts/\\d+$': async (request: NextRequest) => {
    console.log('Regex middleware', request.nextUrl.pathname);
    return NextResponse.next();
  },
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

## Motivation

I'm working with Next.js project for a few years now, after Vercel moved multiple `/**/_middleware.ts` files to a single `/middleware.ts` file, there was a unfilled gap - but just for now.
After a 2023 retro I had found that there is no good solution for that problem, so I took matters into my own hands. I wanted to share that motivation with everyone here, as I think that we all need to remember how it all started.

Hope it will save you some time and would make your project DX better!
