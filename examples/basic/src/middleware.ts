import createMiddleware from 'next-easy-middlewares';
import { type NextRequest, NextResponse } from 'next/server';

const middlewares = {
  '/page1/:path*': [
    async (request: NextRequest) => {
      const response = NextResponse.next();
      console.log('Middleware for /page1', request.nextUrl.pathname);
      response.cookies.set('passed-cookie', 'cookie-value');
      response.headers.set('x-custom-header', 'header-value');
      return response;
    },
    async (request: NextRequest) => {
      console.log('Chained middleware for /page1', request.nextUrl.pathname);
      console.log('Passed cookie value:', request.cookies.get('passed-cookie'));
      console.log(
        'Passed header value:',
        request.headers.get('x-custom-header'),
      );
      return NextResponse.next();
    },
  ],
  '/page2': [
    async (request: NextRequest) => {
      const response = NextResponse.next();
      console.log('Middleware for /page2', request.nextUrl.pathname);
      response.cookies.set('passed-cookie', 'cookie-value');
      response.headers.set('x-custom-header', 'header-value');
      return response;
    },
    async (request: NextRequest) => {
      const redirectUrl = 'http://localhost:3001/page1'; // Redirect within the same domain
      console.log('Redirecting to:', redirectUrl);

      const response = NextResponse.redirect(redirectUrl, {
        headers: request.headers, // Transfer original headers to the redirect response
      });
      return response;
    },
    async (request: NextRequest) => {
      console.log('Chained middleware for /page2', request.nextUrl.pathname);
      console.log('Passed cookie value:', request.cookies.get('passed-cookie'));
      console.log(
        'Passed header value:',
        request.headers.get('x-custom-header'),
      );
      return NextResponse.next();
    },
  ],
};

// Create middlewares helper
export const middleware = createMiddleware(middlewares);

export const config = {
  matcher: ['/page2', '/page1/:path*'],
};
