import { NEMO } from "@rescale/nemo";
import { type NextRequest } from "next/server";

const middlewares = {
  "/page1": [
    (request: NextRequest) => {
      console.log("middleware 1 before", request.headers.get('x-custom-header'));
      request.headers.set("x-custom-header", "custom-value");
      console.log("middleware 1 after", request.headers.get('x-custom-header'));
    },
    (request: NextRequest) => {
      console.log("middleware 2", "x-custom-sent-header", request.headers.get('x-custom-sent-header'));
      console.log("middleware 2", "x-custom-header", request.headers.get('x-custom-header'));
    }
  ],
};

// Create middlewares helper
export const { middleware } = new NEMO(middlewares, undefined, {
  debug: true
});

export const config = {
  matcher: ["/page2", "/page1/:path*"],
};
