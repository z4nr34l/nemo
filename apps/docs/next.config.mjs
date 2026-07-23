// Redirect-only shell.
//
// The documentation moved to the repository root (`docs/`) and is published at
// https://zanreal.com/docs/oss/nemo, which the marketing site builds from that
// directory - the same arrangement as every other ZanReal OSS package.
//
// Nothing here renders documentation any more. This app exists solely to serve
// the redirect table below, so that every URL this host ever published keeps
// resolving. Some of them are baked into immutable npm metadata and can never
// be allowed to 404.
const DOCS = "https://zanreal.com/docs/oss/nemo";

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Every rule below is `permanent`, which Next.js serves as a 308. Search
  // engines consolidate a 308 exactly as they do a 301, and nothing here is
  // temporary: these paths are never coming back to this host.
  //
  // Two properties matter more than the individual rules:
  //
  //   1. Path for path. `/docs/2.0/functions` goes to the new v2 functions
  //      page, not to the docs root. Collapsing a version tree onto one page
  //      throws away the link equity every one of those URLs accumulated, and
  //      Google reads a redirect to an unrelated page as a soft 404 - it drops
  //      the target rather than transferring anything to it.
  //
  //   2. One hop. The rules map the ORIGINAL paths straight to their FINAL
  //      destination rather than chaining `/docs/2.0/x` -> `/docs/v2/x` ->
  //      `zanreal.com/...`. The version folders were renamed as part of the
  //      same move, so a chain was the tempting shape; consolidation is
  //      strongest across a single hop, and each extra hop is another chance
  //      for a crawler to give up before the end.
  //
  // Order is significant: Next.js takes the first match, so the exact paths
  // come before the `:path*` catch-alls.
  redirects: () => {
    return [
      // The old docs root.
      { source: "/", destination: DOCS, permanent: true },
      { source: "/docs", destination: DOCS, permanent: true },

      // MUST come before the generic /docs/2.0/:path* rule below. The
      // stewardship page did not just move host, it changed major: it now
      // belongs to the current major only, so the generic rule would send it
      // to a v2 page that no longer exists. This URL is linked from the
      // published README of @zanreal/nemo, so it has to land on real content.
      {
        source: "/docs/2.0/stewardship",
        destination: `${DOCS}/latest/stewardship`,
        permanent: true,
      },

      // Bare version roots, ahead of the catch-alls so the destination has no
      // trailing empty segment.
      { source: "/docs/2.0", destination: `${DOCS}/v2`, permanent: true },
      { source: "/docs/1.4", destination: `${DOCS}/v1`, permanent: true },

      // The version trees, path for path.
      //
      // /docs/2.0/migration is the one URL in here that can NEVER 404: it is
      // baked into the npm deprecation metadata of @rescale/nemo, which npm
      // serves for the already-published versions and which cannot be edited.
      // Every install of the alias prints it. It is covered by this rule
      // rather than by a rule of its own because the page did not change
      // major - it is still the v2 migration guide - but it is the reason this
      // rule exists at all, and it must survive any future edit to this list.
      { source: "/docs/2.0/:path*", destination: `${DOCS}/v2/:path*`, permanent: true },
      { source: "/docs/1.4/:path*", destination: `${DOCS}/v1/:path*`, permanent: true },

      // Anything else under /docs. Nothing outside the version folders was
      // ever published here, so this exists so that a stray or mistyped docs
      // URL is answered by the site that now owns the docs namespace - and so
      // that no /docs path on this host can quietly start serving content
      // again alongside the copy on zanreal.com.
      { source: "/docs/:path*", destination: `${DOCS}/:path*`, permanent: true },
    ];
  },
};

export default config;
