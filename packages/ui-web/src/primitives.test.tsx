import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Badge, Card, Stack, Text } from "./index";

describe("primitive layout and text components", () => {
  it("renders Text with size, weight, tone, align, and custom class contracts", () => {
    const markup = renderToStaticMarkup(
      <Text
        align="center"
        className="custom-copy"
        size="lg"
        tone="muted"
        weight="bold"
      >
        Hello
      </Text>,
    );

    expect(markup).toContain("<p");
    expect(markup).toContain("nado-text");
    expect(markup).toContain("nado-text--size-lg");
    expect(markup).toContain("nado-text--weight-bold");
    expect(markup).toContain("nado-text--tone-muted");
    expect(markup).toContain("nado-text--align-center");
    expect(markup).toContain("custom-copy");
    expect(markup).toContain("Hello");
  });

  it("renders Stack with gap, direction, align, and custom class contracts", () => {
    const markup = renderToStaticMarkup(
      <Stack
        align="stretch"
        className="custom-stack"
        direction="horizontal"
        gap="lg"
      >
        <span>One</span>
        <span>Two</span>
      </Stack>,
    );

    expect(markup).toContain("<div");
    expect(markup).toContain("nado-stack");
    expect(markup).toContain("nado-stack--gap-lg");
    expect(markup).toContain("nado-stack--direction-horizontal");
    expect(markup).toContain("nado-stack--align-stretch");
    expect(markup).toContain("custom-stack");
    expect(markup).toContain("<span>One</span>");
    expect(markup).toContain("<span>Two</span>");
  });

  it("renders Card with padding, tone, radius, and custom class contracts", () => {
    const markup = renderToStaticMarkup(
      <Card
        className="custom-card"
        padding="lg"
        radius="composer"
        tone="elevated"
      >
        <span>Card content</span>
      </Card>,
    );

    expect(markup).toContain("<div");
    expect(markup).toContain("nado-card");
    expect(markup).toContain("nado-card--padding-lg");
    expect(markup).toContain("nado-card--tone-elevated");
    expect(markup).toContain("nado-card--radius-composer");
    expect(markup).toContain("custom-card");
    expect(markup).toContain("<span>Card content</span>");
  });

  it("renders Badge with tone, size, and custom class contracts", () => {
    const markup = renderToStaticMarkup(
      <Badge className="custom-badge" size="md" tone="success">
        Saved
      </Badge>,
    );

    expect(markup).toContain("<span");
    expect(markup).toContain("nado-badge");
    expect(markup).toContain("nado-badge--tone-success");
    expect(markup).toContain("nado-badge--size-md");
    expect(markup).toContain("custom-badge");
    expect(markup).toContain("Saved");
  });
});
