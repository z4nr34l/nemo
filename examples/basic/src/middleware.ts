import { createMiddleware } from 'next-easy-middlewares';
import { type NextRequest, NextResponse } from 'next/server';

const middlewares = {
  '/page1': [
    async (request: NextRequest) => {
      console.log('Middleware for /page1', request.nextUrl.pathname);
      request.cookies.set('passed-cookie', 'cookie-value');
      request.headers.set('x-custom-header', 'header-value');
      return NextResponse.next();
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
      console.log('Middleware for /page2', request.nextUrl.pathname);
      return NextResponse.redirect('http://localhost:3001/page1');
    },
  ],
};

// Create middlewares helper
export const middleware = createMiddleware(middlewares);

export const config = {
  matcher: ['/((?!api/|_next/|_static|_vercel|[\\w-]+\\.\\w+).*)'],
};
