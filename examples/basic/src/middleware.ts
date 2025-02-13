import { NEMO } from "@rescale/nemo";
import { NextResponse } from "next/server";

const middlewares = {
  "/page1": [
    async ({ request, forward }: MiddlewareFunctionProps) => {
      const response = NextResponse.next({
        request,
      });

      console.log("Middleware for /page1", request.nextUrl.pathname);
      response.cookies.set("passed-cookie", "cookie-value");
      response.headers.set("x-custom-header", "header-value");

      forward(response);
    },
    async ({ request, response }: MiddlewareFunctionProps) => {
      console.log("Chained middleware for /page1", request.nextUrl.pathname);
      console.log("Passed cookie value:", request.cookies.get("passed-cookie"));
      console.log(
        "Passed header value:",
        response?.headers.get("x-custom-header")
      );
    },
  ],
  "/page2": [
    async ({ request, forward }: MiddlewareFunctionProps) => {
      const response = NextResponse.next();
      console.log("Middleware for /page2", request.nextUrl.pathname);
      response.cookies.set("passed-cookie", "cookie-value");
      response.headers.set("x-custom-header", "header-value");

      forward(response);
    },
    async () => {
      const redirectUrl = "http://localhost:3001/page1"; // Redirect within the same domain
      console.log("Redirecting to:", redirectUrl);

      return NextResponse.redirect(redirectUrl);
    },
    /**
     * THIS WILL NOT BE EXECUTED!
     */
    async ({ request, forward }: MiddlewareFunctionProps) => {
      const response = NextResponse.next({ request });

      console.log("This should not be executed");
      console.log("Chained middleware for /page2", request.nextUrl.pathname);
      console.log("Passed cookie value:", request.cookies.get("passed-cookie"));
      console.log(
        "Passed header value:",
        request.headers.get("x-custom-header")
      );

      forward(response);
    },
  ],
} satisfies MiddlewareConfig;

// Create middlewares helper
export const { middleware } = new NEMO(middlewares);

export const config = {
  matcher: ["/page2", "/page1/:path*"],
};
