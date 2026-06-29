import { tokens } from "./tokens";

type CssTokenSource = {
  readonly [name: string]: CssTokenValue;
};

type CssTokenValue = string | number | CssTokenSource;

export type CssCustomPropertyMap = Record<`--${string}`, string>;

export type CssCustomPropertyOptions = {
  prefix?: string;
  selector?: string;
};

export function createCssCustomPropertyMap(
  tokenSource: CssTokenSource = tokens,
  options: CssCustomPropertyOptions = {},
) {
  const prefix = options.prefix ?? "nado";
  const properties: CssCustomPropertyMap = {};

  collectCssCustomProperties({
    path: [],
    prefix,
    properties,
    value: tokenSource,
  });

  return properties;
}

export function createCssCustomPropertyString(
  tokenSource: CssTokenSource = tokens,
  options: CssCustomPropertyOptions = {},
) {
  const selector = options.selector ?? ":root";
  const properties = createCssCustomPropertyMap(tokenSource, options);
  const declarations = Object.entries(properties).map(
    ([name, value]) => `  ${name}: ${value};`,
  );

  return `${selector} {\n${declarations.join("\n")}\n}`;
}

function collectCssCustomProperties({
  path,
  prefix,
  properties,
  value,
}: {
  path: string[];
  prefix: string;
  properties: CssCustomPropertyMap;
  value: CssTokenValue;
}) {
  if (isCssTokenSource(value)) {
    for (const [name, nestedValue] of Object.entries(value)) {
      collectCssCustomProperties({
        path: [...path, name],
        prefix,
        properties,
        value: nestedValue,
      });
    }
    return;
  }

  const variableName = [`--${prefix}`, ...normalizeTokenPath(path)]
    .map(toKebabCase)
    .join("-");
  properties[variableName as `--${string}`] = String(value);
}

function normalizeTokenPath(path: string[]) {
  if (path[0] === "component") {
    return path.slice(1);
  }

  if (path[0] === "typography" && path[1] === "text") {
    return path.slice(1);
  }

  return path;
}

function toKebabCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

function isCssTokenSource(value: CssTokenValue): value is CssTokenSource {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
