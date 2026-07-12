const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const appVariant =
  process.env.NADO_MOBILE_APP_VARIANT === "design-demo"
    ? "design-demo"
    : "production";
const config = getDefaultConfig(__dirname);

config.cacheVersion = `nado-mobile-${appVariant}`;

if (appVariant === "design-demo") {
  const defaultResolveRequest = config.resolver.resolveRequest;

  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (
      moduleName === "./src/entry/AppVariant" &&
      path.resolve(context.originModulePath) ===
        path.resolve(__dirname, "index.ts")
    ) {
      return {
        filePath: path.resolve(__dirname, "App.design-demo.tsx"),
        type: "sourceFile",
      };
    }

    if (defaultResolveRequest) {
      return defaultResolveRequest(context, moduleName, platform);
    }

    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
