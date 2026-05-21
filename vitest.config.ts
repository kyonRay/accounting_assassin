import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import path from "path";
import yaml from "@rollup/plugin-yaml";
import remarkGfm from "remark-gfm";

export default defineConfig({
  plugins: [
    mdx({ providerImportSource: "@mdx-js/react", remarkPlugins: [remarkGfm] }),
    react(),
    yaml(),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // Codex review fix: Vitest default include only matches *.{test,spec}.ts;
    // our chapter tests use content/chapters/NN-slug/test.ts naming convention
    // (per spec § 3.2). Must add it explicitly or pnpm test:chapters runs nothing.
    include: [
      "**/*.{test,spec}.{ts,tsx}",
      "content/chapters/**/test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@content": path.resolve(__dirname, "./content"),
    },
  },
});
