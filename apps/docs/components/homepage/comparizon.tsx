import { CodeBlock } from "@/components/code-block";

export function Comparizon() {
  return (
    <>
      <div className="p-8 md:p-14">
        <h2 className="text-center font-bold text-2xl">
          First, let&apos;s let the code get the word out...
        </h2>
      </div>

      <div className="relative">
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 font-bold text-2xl hidden md:block">
          VS
        </span>
        <div className="grid md:grid-cols-2 divide-x-px">
          <div className="relative flex flex-col">
            <span className="absolute top-1.5 right-3 text-sm text-muted-foreground z-10">
              before
            </span>
            <CodeBlock
              lang="ts"
              code={codeBefore}
              className="h-full"
              wrapper={{
                allowCopy: false,
                title: "middleware.ts",
                lang: "typescript",
                icon: <TSIcon />,
                className: "my-0 rounded-none flex-1 h-full",
              }}
            />
          </div>
          <div className="relative flex flex-col">
            <span className="absolute top-1.5 right-3 text-sm text-muted-foreground z-10">
              after
            </span>
            <CodeBlock
              lang="ts"
              code={codeAfter}
              className="h-full"
              wrapper={{
                allowCopy: false,
                title: "middleware.ts",
                lang: "typescript",
                icon: <TSIcon />,
                className: "my-0 rounded-none flex-1 h-full",
              }}
            />
          </div>
        </div>
      </div>

      <div className="p-8 md:p-14">
        <h2 className="text-center font-bold text-2xl">
          Do you feel the difference?
        </h2>
      </div>
    </>
  );
}

const codeBefore = `import { NextRequest } from 'next/server';

export const middleware = async (req: NextRequest) => {
  let user = undefined;
  let team = undefined;
  const token = req.headers.get('token');

  if(req.nextUrl.pathname.startsWith('/auth')) {
    user = await getUserByToken(token);

    if(!user) {
      return NextResponse.redirect('/login');
    }

    return NextResponse.next();
  }

  if(req.nextUrl.pathname.startsWith('/team/') || req.nextUrl.pathname.startsWith('/t/')) {
    user = await getUserByToken(token);

    if(!user) {
      return NextResponse.redirect('/login');
    }

    const slug = req.nextUrl.query.slug;
    team = await getTeamBySlug(slug);

    if(!team) {
      return NextResponse.redirect('/');
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|_static|_vercel|[\\\\w-]+\\\\.\\\\w+).*)'],
};`;

const codeAfter = `import { createMiddleware, type MiddlewareFunctionProps } from '@rescale/nemo';
import { auth } from '@/app/(auth)/auth/_middleware';
import { team } from '@/app/(team)/team/_middleware';

const globalMiddlewares = {
  before: auth, // OR: [auth, ...]
};

const middlewares = {
  '/(team|t)/:slug': team, // OR: [team, ...]
};

export const { middleware } = new NEMO(middlewares, globalMiddlewares);

export const config = {
  matcher: ['/((?!_next/|_static|_vercel|[\\\\w-]+\\\\.\\\\w+).*)'],
};`;

const TSIcon = () => {
  return (
    <svg viewBox="0 0 24 24">
      <path
        d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"
        fill="currentColor"
      ></path>
    </svg>
  );
};
