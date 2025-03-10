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
- Context sharing between middleware via shared storage
- Support for Next.js native middleware patterns
- Request/Response header and cookie forwarding
- Middleware nesting and composition

## Middleware Composition

NEMO supports nested middleware functions, allowing you to compose complex request handling logic:

### Nested Functions

```typescript
import { createNEMO } from '@rescale/nemo';

export default createNEMO({
  '/api': [
    // First middleware in the chain
    async (request, { storage }) => {
      storage.set('timestamp', Date.now());
      // Continues to the next middleware
    },
    // Second middleware accesses shared storage
    async (request, { storage }) => {
      const timestamp = storage.get('timestamp');
      console.log(`Request started at: ${timestamp}`);
      // Continues to the next middleware or returns response
    }
  ],
  // Multiple paths can have their own middleware chains
  '/auth': [
    checkAuth,
    validateSession,
    trackActivity
  ]
});
```

Each middleware in a chain is executed in sequence until one returns a response or all are completed.

## API Reference

### Types

#### `NextMiddleware`

```typescript
type NextMiddleware = (
  request: NextRequest,
  event: NemoEvent
) => NextMiddlewareResult | Promise<NextMiddlewareResult>;
```

The standard middleware function signature used in NEMO, compatible with Next.js native middleware.

#### `MiddlewareConfig`

```typescript
type MiddlewareConfig = Record<string, MiddlewareConfigValue>;
```

A configuration object that maps route patterns to middleware functions or arrays of middleware functions.

#### `GlobalMiddlewareConfig`

```typescript
type GlobalMiddlewareConfig = Partial<
  Record<"before" | "after", NextMiddleware | NextMiddleware[]>
>;
```

Configuration for global middleware that runs before or after route-specific middleware.

### Main Functions

#### `createNEMO`

```typescript
function createNEMO(
  middlewares: MiddlewareConfig,
  globalMiddleware?: GlobalMiddlewareConfig,
  config?: NemoConfig
): NextMiddleware
```

Creates a composed middleware function with enhanced features:

- Executes middleware in order (global before → path-matched middleware → global after)
- Provides shared storage context between middleware functions
- Handles errors with custom error handlers
- Supports custom storage adapters

#### `NemoConfig` options

```typescript
interface NemoConfig {
  debug?: boolean;
  silent?: boolean;
  errorHandler?: ErrorHandler;
  enableTiming?: boolean;
  storage?: StorageAdapter | (() => StorageAdapter);
}
```

## Matchers

To make it easier to understand, you can check the below examples:

### Simple route

Matches `/dashboard` route and returns no params.

```plaintext title="Simple route"
/dashboard
```

### Params

General structure of the params is `:paramName` where `paramName` is the name of the param that will be returned in the middleware function.

#### Single

Matches `/dashboard/anything` route and returns `team` param with `anything` value.

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
import { createNEMO } from '@rescale/nemo';

export default createNEMO({
  '/api{/*path}': async (request) => {
    // Handle API routes
  },
  '/protected{/*path}': async (request, { storage }) => {
    // Handle protected routes
  }
});
```

You can test your's matchers [using this tool](https://www.rescale.build/tools/path-to-regexp).

### Using Global Middleware

```typescript
import { createNEMO } from '@rescale/nemo';

export default createNEMO({
  '/api{/*path}': apiMiddleware,
},
{
  before: [loggerMiddleware, authMiddleware],
  after: cleanupMiddleware,
});
```

### Storage API

The Storage API allows you to share data between middleware executions:

```typescript
import { createNEMO } from '@rescale/nemo';

export default createNEMO({
  '/': [
    async (req, { storage }) => {
      // Set values
      storage.set('counter', 1);
      storage.set('items', ['a', 'b']);
      storage.set('user', { id: 1, name: 'John' });
      
      // Check if key exists
      if (storage.has('counter')) {
        // Get values (with type safety)
        const count = storage.get<number>('counter');
        const items = storage.get<string[]>('items');
        const user = storage.get<{id: number, name: string}>('user');
        
        // Delete a key
        storage.delete('counter');
      }
    }
  ]
});
```

### URL Parameters

Access URL parameters through the event's params property:

```typescript
import { createNEMO } from '@rescale/nemo';

export default createNEMO({
  '/users/:userId': async (request, event) => {
    const { userId } = event.params;
    console.log(`Processing request for user: ${userId}`);
  }
});
```

## Notes

- Middleware functions are executed in order until a Response is returned
- The storage is shared between all middleware functions in the chain
- Headers and cookies are automatically forwarded between middleware functions
- Supports Next.js native middleware pattern

## Motivation

I'm working with Next.js project for a few years now, after Vercel moved multiple `/**/_middleware.ts` files to a single `/middleware.ts` file, there was a unfilled gap - but just for now.
After a 2023 retro I had found that there is no good solution for that problem, so I took matters into my own hands. I wanted to share that motivation with everyone here, as I think that we all need to remember how it all started.

Hope it will save you some time and would make your project DX better!
