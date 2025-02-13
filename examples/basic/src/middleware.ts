import { NEMO, type MiddlewareConfig } from "@rescale/nemo";

const middlewares = {
  "/page1": [
    (request) => {
      console.log("middleware 1 before", request.headers);
      request.headers.set("x-custom-header", "custom-value");
      console.log("middleware 1 after", request.headers);
    },
    (request) => {
      console.log("middleware 2", request.headers);
    }
  ],
} satisfies MiddlewareConfig;

// Create middlewares helper
export const { middleware } = new NEMO(middlewares, undefined, {
  debug: true
});

export const config = {
  matcher: ["/page2", "/page1/:path*"],
};
