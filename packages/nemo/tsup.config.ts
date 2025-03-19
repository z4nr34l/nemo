import path from "node:path";
import type { Options } from "tsup";
import { defineConfig } from "tsup";

// eslint-disable-next-line import/no-default-export -- tsup config
export default defineConfig((options: Options) => ({
  entry: ["src/**/*.ts"],
  format: ["esm"],
  clean: true,
  splitting: false,
  dts: true,
  minify: true,
  external: ["next"],
  target: "node20",
  tsconfig: path.resolve(__dirname, "./tsconfig.json"),
  ...options,
}));
