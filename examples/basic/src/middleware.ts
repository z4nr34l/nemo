import {
  createMiddleware,
  type MiddlewareConfig,
  type MiddlewareFunctionProps,
} from '@rescale/nemo';
import { NextResponse } from 'next/server';

const middlewares = {
  '/page1{/:path}?': [
    async ({ request }: MiddlewareFunctionProps) => {
      const response = NextResponse.next();
      console.log('Middleware for /page1', request.nextUrl.pathname);
      response.cookies.set('passed-cookie', 'cookie-value');
      response.headers.set('x-custom-header', 'header-value');
      return response;
    },
    async ({ request, response }: MiddlewareFunctionProps) => {
      console.log('Chained middleware for /page1', request.nextUrl.pathname);
      console.log('Passed cookie value:', request.cookies.get('passed-cookie'));
      console.log(
        'Passed header value:',
        request.headers.get('x-custom-header'),
      );
      return response;
    },
  ],
  '/page2': [
    async ({ request }: MiddlewareFunctionProps) => {
      const response = NextResponse.next();
      console.log('Middleware for /page2', request.nextUrl.pathname);
      response.cookies.set('passed-cookie', 'cookie-value');
      response.headers.set('x-custom-header', 'header-value');
      return response;
    },
    async ({ request }: MiddlewareFunctionProps) => {
      const redirectUrl = 'http://localhost:3001/page1'; // Redirect within the same domain
      console.log('Redirecting to:', redirectUrl);

      return NextResponse.redirect(redirectUrl, {
        headers: request.headers, // Transfer original headers to the redirect response
      });
    },
    async ({ request, response }: MiddlewareFunctionProps) => {
      console.log('Chained middleware for /page2', request.nextUrl.pathname);
      console.log('Passed cookie value:', request.cookies.get('passed-cookie'));
      console.log(
        'Passed header value:',
        request.headers.get('x-custom-header'),
      );
      return response;
    },
  ],
} satisfies MiddlewareConfig;

// Create middlewares helper
export const middleware = createMiddleware(middlewares);

export const config = {
  matcher: ['/page2', '/page1/:path*'],
};
