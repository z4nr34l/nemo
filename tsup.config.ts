import type { Options } from 'tsup';
import { defineConfig } from 'tsup';

export default defineConfig((options: Options) => ({
  entry: ['src/**/*.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  minify: true,
  external: [],
  ...options,
}));
