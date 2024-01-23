import path from "path";
import type { Options } from 'tsup';
import { defineConfig } from 'tsup';

export default defineConfig((options: Options) => ({
  entry: ['src/**/*.ts'],
  format: ['esm', 'cjs'],
  clean: true,
  splitting: false,
  dts: true,
  minify: true,
  external: ['next'],
  platform: "node",
  target: "node20",
  tsconfig: path.resolve(__dirname, "./tsconfig.json"),
  ...options,
}));
