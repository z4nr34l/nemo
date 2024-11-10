---
"minor-version-upgrade": {
  "summary": "Updated the `executeMiddleware` function to return immediately if the middleware returns a `NextResponse` or `Response` instance. Added a check in the `executeMiddleware` function to continue the chain execution only when nothing is returned from middleware."
}
