import createMiddleware, { CustomMiddleware } from 'next-easy-middlewares';
import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

const customWithAuth = withAuth({
  pages: {
    error: '/not-found',
  },
}) satisfies CustomMiddleware;

const middlewares = {
  '/page1': [
    async (request: NextRequest) => {
      console.log('Middleware for /page1', request.nextUrl.pathname);
      return NextResponse.next();
    },
  ],
  '/page2': [
    customWithAuth,
    async (request: NextRequest) => {
      console.log('Middleware for /page2', request.nextUrl.pathname);
      return NextResponse.redirect('http://localhost:3000/page1');
    },
  ],
};

// Create middlewares helper
export const middleware = createMiddleware(middlewares);

export const config = {
  matcher: ['/((?!api/|_next/|_static|_vercel|[\\w-]+\\.\\w+).*)'],
};
