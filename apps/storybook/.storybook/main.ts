import type { StorybookConfig } from "@storybook/react-vite";

const toPathname = (path: string) => new URL(path, import.meta.url).pathname;
const STORYBOOK_CHUNK_SIZE_WARNING_LIMIT_KB = 1_200;

const config: StorybookConfig = {
  addons: ["@storybook/addon-docs"],
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
        chunkSizeWarningLimit: STORYBOOK_CHUNK_SIZE_WARNING_LIMIT_KB,
      },
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
            find: /^@nado\/shared$/,
            replacement: toPathname("../../../packages/shared/src/index.ts"),
          },
        ],
      },
    };
  },
};

export default config;
