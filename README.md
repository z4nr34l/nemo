# next-easy-middlewares

`next-easy-middlewares` is a simple utility for creating path-based middleware in Next.js applications. Simplify multi-middleware management and reduce general boilerplate in few easy steps with that package.

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

### Basic definition

Code in `middleware.ts` file:

```ts
import { createMiddleware } from 'next-easy-middlewares';
import { type NextRequest, NextResponse } from 'next/server';

const middlewares = {
  // define your middlewares here...
};

// Create middlewares helper
export const middleware = createMiddleware(middlewares);

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

## Matcher types

### Simple

```ts
// ...

const middlewares = {
  // This will match /blog route only
  '/blog': blogMiddleware,
  // This will match /docs route only
  '/docs': docsMiddleware,
};
```

### Path

```ts
// ...

const middlewares = {
  // This will match routes starting with /blog/*
  '/blog/:path*': blogMiddleware,
  // This will match routes starting with /docs/*
  '/docs/:path*': docsMiddleware,
};
```

### Dynamic segments

```ts
// ...

const middlewares = {
  // This will match /blog/[slug] routes only
  '/blog/[slug]': blogMiddleware,
  // This will match /blog/[slug]/view routes only
  '/blog/[slug]/view': blogViewMiddleware,
};
```

### RegEx

```ts
// ...

const middlewares = {
  // This will match any url in /posts that's next segment is number-typed
  // Example: /posts/123, but not /posts/asd
  'regex:^/posts/\\d+$': regexMiddleware,
};
```

## Middlewares defining

### Inline

```ts
// ...

const middlewares = {
  // This will match /blog route only
  '/blog': async (request: NextRequest) => {
    console.log('Middleware for /blog', request.nextUrl.pathname);
    return NextResponse.next();
  },
};
```

### Reference

```ts
// ...

const blogMiddleware = async (request: NextRequest) => {
  console.log('Middleware for /blog', request.nextUrl.pathname);
  return NextResponse.next();
};

const middlewares = {
  // This will match /blog route only
  '/blog': blogMiddleware,
};
```

### Import

```ts
import { blogMiddleware } from '@/app/(blog)/_middleware';

// ...

const middlewares = {
  // This will match /blog route only
  '/blog': blogMiddleware,
};
```

## Middleware chaining

This packages can intercept `NextResponse.next()` returned from middleware function to chain middlewares for same matcher.

```ts
// ...

const middlewares = {
  // This will match /blog route only and execute both middlewares for it
  '/blog': [blogMiddleware, blogSecondMiddleware],
};
```

## Global middlewares

You can define global middleware that would be executed in every middleware execution in your application.
I've implemented runtime policy, so you can decide if it will be executed before/after (or both) than rest of defined middlewares.

```ts
// ...

const globalMiddlewares = {
  before: authMiddleware,
  after: analyticsMiddleware,
};

const middlewares = {
  // define your middlewares here...
};

// Create middlewares helper
export const middleware = createMiddleware(middlewares, globalMiddlewares);

// ...
```

## Motivation

I'm working with Next.js project for a few years now, after Vercel moved multiple `/**/_middleware.ts` files to a single `/middleware.ts` file, there was a unfilled gap - but just for now.
After a 2023 retro I had found that there is no good solution for that problem, so I took matters into my own hands. I wanted to share that motivation with everyone here, as I think that we all need to remember how it all started.

Hope it will save you some time and would make your project DX better!
