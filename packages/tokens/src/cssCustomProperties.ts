import { tokens } from "./tokens";

type CssTokenSource = {
  readonly [name: string]: CssTokenValue;
};

type CssTokenValue = string | number | CssTokenSource;
type CssTokenAlias = {
  path: string[];
  variableName: `--${string}`;
};

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
  const aliases = createNonComponentAliasMap(tokenSource, prefix);
  const properties: CssCustomPropertyMap = {};

  collectCssCustomProperties({
    aliases,
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
  aliases,
  path,
  prefix,
  properties,
  value,
}: {
  aliases: Map<string, CssTokenAlias[]>;
  path: string[];
  prefix: string;
  properties: CssCustomPropertyMap;
  value: CssTokenValue;
}) {
  if (isCssTokenSource(value)) {
    for (const [name, nestedValue] of Object.entries(value)) {
      collectCssCustomProperties({
        aliases,
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
  properties[variableName as `--${string}`] = getCssCustomPropertyValue({
    aliases,
    path,
    value,
  });
}

function createNonComponentAliasMap(
  tokenSource: CssTokenSource,
  prefix: string,
) {
  const aliases = new Map<string, CssTokenAlias[]>();
  collectNonComponentAliases({
    aliases,
    path: [],
    prefix,
    value: tokenSource,
  });
  return aliases;
}

function collectNonComponentAliases({
  aliases,
  path,
  prefix,
  value,
}: {
  aliases: Map<string, CssTokenAlias[]>;
  path: string[];
  prefix: string;
  value: CssTokenValue;
}) {
  if (isCssTokenSource(value)) {
    for (const [name, nestedValue] of Object.entries(value)) {
      collectNonComponentAliases({
        aliases,
        path: [...path, name],
        prefix,
        value: nestedValue,
      });
    }
    return;
  }

  if (path[0] === "component") {
    return;
  }

  const variableName = [`--${prefix}`, ...normalizeTokenPath(path)]
    .map(toKebabCase)
    .join("-") as `--${string}`;
  const aliasKey = createAliasKey(value);

  aliases.set(aliasKey, [
    ...(aliases.get(aliasKey) ?? []),
    { path, variableName },
  ]);
}

function getCssCustomPropertyValue({
  aliases,
  path,
  value,
}: {
  aliases: Map<string, CssTokenAlias[]>;
  path: string[];
  value: string | number;
}) {
  if (path[0] !== "component") {
    return String(value);
  }

  const alias = findBestAlias(aliases.get(createAliasKey(value)), path);

  return alias ? `var(${alias})` : String(value);
}

function findBestAlias(aliases: CssTokenAlias[] | undefined, path: string[]) {
  if (!aliases || aliases.length === 0) {
    return null;
  }

  const allowedAliases = aliases.filter((alias) =>
    isAliasFamilyAllowed(alias.path, path),
  );

  if (allowedAliases.length === 0) {
    return null;
  }

  return [...allowedAliases].sort(
    (left, right) =>
      getAliasScore(right.path, path) - getAliasScore(left.path, path),
  )[0]?.variableName;
}

function isAliasFamilyAllowed(aliasPath: string[], componentPath: string[]) {
  const aliasFamily = aliasPath[0];
  const leafName = componentPath.at(-1);
  const leafTerms = new Set(splitNameTerms(leafName ?? ""));

  if (
    aliasFamily === "color" &&
    (leafName === "background" ||
      leafName === "foreground" ||
      leafName === "border")
  ) {
    return true;
  }

  if (aliasFamily === "spacing" && leafTerms.has("padding")) {
    return true;
  }

  if (aliasFamily === "radius" && leafName === "radius") {
    return true;
  }

  if (aliasFamily === "shadow" && leafName === "shadow") {
    return true;
  }

  return false;
}

function getAliasScore(aliasPath: string[], componentPath: string[]) {
  const aliasTerms = new Set(aliasPath.flatMap(splitNameTerms));
  const componentTerms = new Set(componentPath.flatMap(splitNameTerms));
  let score = 0;

  for (const term of aliasTerms) {
    if (componentTerms.has(term)) {
      score += 2;
    }
  }

  const leafName = componentPath.at(-1);
  const leafTerms = new Set(splitNameTerms(leafName ?? ""));

  if (leafName === "foreground" && aliasTerms.has("ink")) {
    score += 3;
  }

  if (leafName === "background" && aliasTerms.has("surface")) {
    score += 1;
  }

  if (leafTerms.has("padding") && aliasTerms.has("spacing")) {
    score += 6;
  }

  if (leafName === "radius" && aliasTerms.has("radius")) {
    score += 6;
  }

  return score;
}

function splitNameTerms(value: string) {
  return toKebabCase(value).split("-");
}

function createAliasKey(value: string | number) {
  return `${typeof value}:${String(value)}`;
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
