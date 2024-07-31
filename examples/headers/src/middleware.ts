import { NextResponse } from 'next/server';
import {
  createMiddleware,
  type MiddlewareConfig,
  type MiddlewareFunctionProps,
} from 'next-easy-middlewares';

const middlewares = {
  '/': [
    async () => {
      console.log('middleware');

      const response = NextResponse.next();

      response.headers.set('x-test-header', 'test-value');
      response.headers.set('x-another-header', 'another-value');

      return response;
    },
    async ({ request }: MiddlewareFunctionProps) => {
      const response = NextResponse.next();

      // Copy headers from the request to the response
      request.headers.forEach((value, key) => {
        response.headers.set(key, value);
      });

      // Modify headers to test if they are carried forward
      response.headers.set('x-demo-header', 'demo-value');

      // Check if the previous headers are present
      if (
        !request.headers.has('x-test-header') ||
        request.headers.get('x-test-header') !== 'test-value'
      ) {
        response.headers.set('x-test-header-error', 'missing or incorrect');
      }
      if (
        !request.headers.has('x-another-header') ||
        request.headers.get('x-another-header') !== 'another-value'
      ) {
        response.headers.set('x-another-header-error', 'missing or incorrect');
      }

      return response;
    },
  ],
} satisfies MiddlewareConfig;

// Create middlewares helper
export const middleware = createMiddleware(middlewares);

export const config = {
  matcher: ['/((?!api/|_next/|_static|_vercel|[\\w-]+\\.\\w+).*)'],
};
