import { createMiddleware } from 'next-easy-middlewares';
import { type NextRequest, NextResponse } from 'next/server';

const middlewares = {
  '/page1': [
    async (request: NextRequest) => {
      console.log('Middleware for /page1', request.nextUrl.pathname);
      request.cookies.set('passed-cookie', 'cookie-value');
      return NextResponse.next();
    },
    async (request: NextRequest) => {
      console.log('Chained middleware for /page1', request.nextUrl.pathname);
      console.log(
        'Passed cookie value: ',
        request.cookies.get('passed-cookie'),
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
