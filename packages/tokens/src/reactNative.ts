import { tokens } from "./tokens";

type CssPixelToken = `${number}px`;
type CssPixelTokenMap = Record<string, CssPixelToken>;

export const nativeTokens = {
  color: tokens.color,
  component: mapNativeTokenValues(tokens.component),
  radius: mapCssPixelTokens(tokens.radius),
  spacing: mapCssPixelTokens(tokens.spacing),
} as const;

type NativeTokenValue<TValue> = TValue extends CssPixelToken
  ? number
  : TValue extends object
    ? { readonly [TName in keyof TValue]: NativeTokenValue<TValue[TName]> }
    : TValue;

function mapNativeTokenValues<TValue>(value: TValue): NativeTokenValue<TValue> {
  if (isCssPixelToken(value)) {
    return toNativeNumber(value) as NativeTokenValue<TValue>;
  }

  if (isTokenObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([name, nestedValue]) => [
        name,
        mapNativeTokenValues(nestedValue),
      ]),
    ) as NativeTokenValue<TValue>;
  }

  return value as NativeTokenValue<TValue>;
}

function mapCssPixelTokens<TTokens extends CssPixelTokenMap>(values: TTokens) {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      name,
      toNativeNumber(value),
    ]),
  ) as { readonly [TName in keyof TTokens]: number };
}

function toNativeNumber(value: CssPixelToken) {
  return Number(value.replace("px", ""));
}

function isCssPixelToken(value: unknown): value is CssPixelToken {
  return typeof value === "string" && /^-?\d+(?:\.\d+)?px$/.test(value);
}

function isTokenObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
