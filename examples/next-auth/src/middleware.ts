import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  createMiddleware,
  type MiddlewareConfig,
  type MiddlewareFunctionProps,
} from 'next-easy-middlewares';

const middlewares = {
  '/page1': [
    async ({ request }: MiddlewareFunctionProps) => {
      console.log('Middleware for /page1', request.nextUrl.pathname);
      return NextResponse.next();
    },
  ],
  '/page2': [
    async ({ request, response }: MiddlewareFunctionProps) => {
      if (await auth(request as never, response as never)) {
        return NextResponse.next();
      }

      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    },
    async ({ request }: MiddlewareFunctionProps) => {
      console.log('Middleware for /page2', request.nextUrl.pathname);
      return NextResponse.redirect('http://localhost:3002/page1');
    },
  ],
} satisfies MiddlewareConfig;

// Create middlewares helper
export const middleware = createMiddleware(middlewares);

export const config = {
  matcher: ['/((?!api/|_next/|_static|_vercel|[\\w-]+\\.\\w+).*)'],
};
