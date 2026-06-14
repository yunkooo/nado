import { tokens } from "./tokens";

type CssPixelToken = `${number}px`;
type CssPixelTokenMap = Record<string, CssPixelToken>;

export const nativeTokens = {
  color: tokens.color,
  radius: mapCssPixelTokens(tokens.radius),
  spacing: mapCssPixelTokens(tokens.spacing),
} as const;

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
