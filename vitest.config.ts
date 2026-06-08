import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  test: {
    exclude: [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/.next/**",
      "**/storybook-static/**",
    ],
  },
});
