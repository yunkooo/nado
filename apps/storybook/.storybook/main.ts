import type { StorybookConfig } from "@storybook/react-vite";
import react from "@vitejs/plugin-react";

const toPathname = (path: string) => new URL(path, import.meta.url).pathname;
// Storybook의 preview runtime, docs, a11y 도구는 제품 코드와 다른 번들이다.
// 실제 예산은 scripts/verify-bundle-budget.mjs에서 framework/story로 나눠 검증한다.
const STORYBOOK_FRAMEWORK_CHUNK_WARNING_LIMIT_KB = 1_200;

const config: StorybookConfig = {
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  stories: [
    "../src/**/*.stories.@(ts|tsx)",
    "../../../packages/ui-web/src/**/*.stories.@(ts|tsx)",
  ],
  viteFinal: async (viteConfig) => {
    const existingAlias = viteConfig.resolve?.alias;
    const aliases = Array.isArray(existingAlias)
      ? existingAlias
      : existingAlias
        ? Object.entries(existingAlias).map(([find, replacement]) => ({
            find,
            replacement,
          }))
        : [];

    return {
      ...viteConfig,
      build: {
        ...viteConfig.build,
        chunkSizeWarningLimit: STORYBOOK_FRAMEWORK_CHUNK_WARNING_LIMIT_KB,
        manifest: true,
      },
      plugins: [...(viteConfig.plugins ?? []), react()],
      resolve: {
        ...viteConfig.resolve,
        alias: [
          ...aliases,
          {
            find: /^@nado\/ui$/,
            replacement: toPathname("../../../packages/ui/src/index.ts"),
          },
          {
            find: /^@nado\/ui\/styles.css$/,
            replacement: toPathname("../../../packages/ui/src/styles.css"),
          },
          {
            find: /^@nado\/ui\/web\/styles.css$/,
            replacement: toPathname("../../../packages/ui/src/styles.css"),
          },
          {
            find: /^@nado\/ui-web$/,
            replacement: toPathname("../../../packages/ui-web/src/index.ts"),
          },
          {
            find: /^@nado\/ui-web\/styles.css$/,
            replacement: toPathname("../../../packages/ui-web/src/styles.css"),
          },
          {
            find: /^@nado\/tokens$/,
            replacement: toPathname("../../../packages/tokens/src/index.ts"),
          },
          {
            find: /^@nado\/tokens\/react-native$/,
            replacement: toPathname(
              "../../../packages/tokens/src/reactNative.ts",
            ),
          },
          {
            find: /^@nado\/shared\/analysis-input$/,
            replacement: toPathname(
              "../../../packages/shared/src/analysisInput.ts",
            ),
          },
          {
            find: /^@nado\/shared\/analysis-presentation$/,
            replacement: toPathname(
              "../../../packages/shared/src/analysisPresentation.ts",
            ),
          },
          {
            find: /^@nado\/shared\/review$/,
            replacement: toPathname(
              "../../../packages/shared/src/reviewSession.ts",
            ),
          },
          {
            find: /^@nado\/shared\/vocabulary$/,
            replacement: toPathname(
              "../../../packages/shared/src/vocabularyContracts.ts",
            ),
          },
          {
            find: /^@nado\/shared$/,
            replacement: toPathname("../../../packages/shared/src/index.ts"),
          },
        ],
      },
    };
  },
};

export default config;
