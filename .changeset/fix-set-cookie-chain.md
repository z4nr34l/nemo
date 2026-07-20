---
"@zanreal/nemo": patch
---

Fix `Set-Cookie` being lost across the middleware chain ([#184](https://github.com/zanreal-labs/nemo/issues/184)).

[#180](https://github.com/zanreal-labs/nemo/pull/180) switched header forwarding to `append`,
which fixed one leg of [#178](https://github.com/zanreal-labs/nemo/issues/178), but three
defects remained. Each is fixed here:

- **Only the last cookie survived.** `getHeadersDiff` collapsed headers through
  `Object.fromEntries`, and `Headers.forEach` yields one entry per `set-cookie` value — so all
  but the last were discarded. Cookies are now carried onto the final response individually.
  This also affected a *single* middleware setting several cookies, which is how chunked
  Supabase auth tokens are stored.
- **Forwarding request headers clobbered earlier cookies.** `NextResponse.next({ request })`
  serialises the request headers into `x-middleware-request-set-cookie`, a snapshot taken when
  that middleware ran. Re-applying it with `.set()` overwrote everything appended since. The
  snapshot is now skipped — the live carrier is append-only and always a superset of it.
- **Terminating responses dropped every cookie.** A rewrite or redirect ends the chain and was
  returned untouched, losing cookies set before it — a session refresh ahead of an i18n rewrite,
  for example. Accumulated cookies are now carried onto the terminating response, without
  duplicating any it already sets.

Reported with a full root-cause analysis and a verified patch by
[@stefanofa](https://github.com/stefanofa).
