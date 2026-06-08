import type { StorybookConfig } from "@storybook/react-vite";

const toPathname = (path: string) => new URL(path, import.meta.url).pathname;

const config: StorybookConfig = {
  addons: ["@storybook/addon-docs"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  stories: ["../src/**/*.stories.@(ts|tsx)"],
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
            find: /^@nado\/shared$/,
            replacement: toPathname("../../../packages/shared/src/index.ts"),
          },
        ],
      },
    };
  },
};

export default config;
