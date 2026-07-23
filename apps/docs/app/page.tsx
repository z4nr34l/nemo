import { redirect } from "next/navigation";

/** Unreachable in practice - `next.config.mjs` redirects `/` before it renders. */
export default function Page() {
  redirect("https://zanreal.com/docs/oss/nemo");
}
