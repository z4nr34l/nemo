# @rescale/nemo

A middleware composition library for Next.js applications that allows you to organize and chain middleware functions based on URL patterns.

[![codecov](https://codecov.io/gh/z4nr34l/nemo/graph/badge.svg?token=10CXWSP5BA)](https://codecov.io/gh/z4nr34l/nemo)

## Installation

```bash
npm install @rescale/nemo
```

```bash
pnpm add @rescale/nemo
```

```bash
bun add @rescale/nemo
```

## Key Features

- Path-based middleware routing
- Global middleware support (before/after)
- Context sharing between middleware
- Support for both legacy and modern middleware patterns
- Request/Response header and cookie forwarding

## API Reference

### Types

#### `MiddlewareFunction`

Can be either a legacy Next.js middleware (`NextMiddleware`) or the new middleware format (`NewMiddleware`).

#### `MiddlewareConfig`

```typescript
Record<string, MiddlewareFunction | MiddlewareFunction[]>
```

#### `MiddlewareFunctionProps`

```typescript
interface MiddlewareFunctionProps {
  request: NextRequest;
  context: MiddlewareContext;
  event: NextFetchEvent;
  forward: (response: MiddlewareReturn) => void;
}
```

### Main Functions

#### `createMiddleware`

```typescript
function createMiddleware(
  pathMiddlewareMap: MiddlewareConfig,
  globalMiddleware?: {
    before?: MiddlewareFunction | MiddlewareFunction[];
    after?: MiddlewareFunction | MiddlewareFunction[];
  }
): NextMiddleware
```

Creates a composed middleware function that:

- Executes global "before" middleware first
- Matches URL patterns and executes corresponding middleware
- Executes global "after" middleware last
- Forwards headers and cookies between middleware functions

#### `forward`

```typescript
function forward(response: MiddlewareReturn): void
```

Function that allows passing response from legacy middleware functions to the next middleware in the chain. This enables compatibility between legacy Next.js middleware and the new middleware format.

## Matchers

To make it easier to understand, you can check the below examples:

### Simple route

Matches `/dashboard` route and returns no params.

```plaintext title="Simple route"
/dashboard
```

### Prams

General structure of the params is `:paramName` where `paramName` is the name of the param that will be returned in the middleware function.

#### Single

Matches `/dashboard/anything` route and returns `team` param with `anything value`.

```plaintext title="Single"
/dashboard/:team
```

You can also define segments in the middle of URL with is matching `/team/anything/dashboard` and returns `team` param with `anything` value.

```plaintext title="Single with suffix"
/dashboard/:team/delete
```

#### Optional

Matches `/dashboard` and `/dashboard/anything` routes and returns `team` param with `anything` value if there is value provided in url.

```plaintext title="Optional"
/dashboard{/:team}
```

```plaintext title="Optional wildcard"
/dashboard{/*team}
```

#### Wildcard

Matches `/dashboard` and `/dashboard/anything/test` routes and returns `team` param with `[anything, test]` value if there is value provided in url.

```plaintext title="Wildcard"
/dashboard/*team
```

## Debugging tool

To debug your matchers and params parsing you can use the following tool:

[Rescale path-to-regexp debugger](https://www.rescale.build/tools/path-to-regexp)

## Usage Examples

### Basic Path-Based Middleware

```typescript
import { createMiddleware } from '@rescale/nemo';

export default createMiddleware({
  '/api{/*path}': async ({ request }) => {
    // Handle API routes
  },
  '/protected{/*path}': async ({ request, context }) => {
    // Handle protected routes
  }
});
```

You can test your's matchers [using this tool](https://www.rescale.build/tools/path-to-regexp).

### Using Global Middleware

```typescript
import { createMiddleware } from '@rescale/nemo';

export default createMiddleware({
  '/api{/*path}': apiMiddleware,
},
{
  before: [loggerMiddleware, authMiddleware],
  after: cleanupMiddleware,
});
```

### Context Sharing

```typescript
import { createMiddleware } from '@rescale/nemo';

export default createMiddleware({
  '/*path': [
    async ({ context }) => {
      context.set('user', { id: 1 });
    },
    async ({ context }) => {
      const user = context.get('user');
      // Use the user data
    }
  ]
});
```

## Notes

- Middleware functions are executed in order until a Response is returned
- The `context` Map is shared between all middleware functions in the chain
- Headers and cookies are automatically forwarded between middleware functions
- Supports both Next.js legacy middleware pattern and the new props-based pattern

## Motivation

I'm working with Next.js project for a few years now, after Vercel moved multiple `/**/_middleware.ts` files to a single `/middleware.ts` file, there was a unfilled gap - but just for now.
After a 2023 retro I had found that there is no good solution for that problem, so I took matters into my own hands. I wanted to share that motivation with everyone here, as I think that we all need to remember how it all started.

Hope it will save you some time and would make your project DX better!
