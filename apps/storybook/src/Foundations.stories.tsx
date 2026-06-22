import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, tokens } from "@nado/ui";

const colorEntries = [
  ["Canvas", tokens.color.canvas],
  ["Surface", tokens.color.surface],
  ["Soft", tokens.color.soft],
  ["Sidebar", tokens.color.sidebar],
  ["Ink", tokens.color.ink],
  ["Muted", tokens.color.muted],
  ["Line", tokens.color.line],
  ["Blue", tokens.color.blue],
  ["Red", tokens.color.red],
];

const buttonTokenEntries = [
  ["primary.background", tokens.component.button.primary.background],
  ["primary.foreground", tokens.component.button.primary.foreground],
  ["secondary.background", tokens.component.button.secondary.background],
  ["secondary.border", tokens.component.button.secondary.border],
  ["secondary.foreground", tokens.component.button.secondary.foreground],
  ["send.background", tokens.component.button.send.background],
  ["send.foreground", tokens.component.button.send.foreground],
  ["radius", tokens.component.button.radius],
] as const;

const buttonSizeEntries = [
  ["md height", tokens.component.button.size.md.height],
  ["md paddingX", tokens.component.button.size.md.paddingX],
  ["icon width", tokens.component.button.size.icon.width],
  ["icon height", tokens.component.button.size.icon.height],
  ["icon radius", tokens.component.button.size.icon.radius],
] as const;

const meta = {
  title: "Foundations/Tokens",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tokens: Story = {
  render: () => (
    <div className="storybook-foundations">
      <section>
        <h2>Colors</h2>
        <div className="storybook-token-grid">
          {colorEntries.map(([name, value]) => (
            <div className="storybook-token" key={name}>
              <span
                className="storybook-token__swatch"
                style={{ backgroundColor: value }}
              />
              <strong>{name}</strong>
              <code>{value}</code>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>Radius</h2>
        <div className="storybook-radius-row">
          <div style={{ borderRadius: tokens.radius.sm }}>sm</div>
          <div style={{ borderRadius: tokens.radius.md }}>md</div>
          <div style={{ borderRadius: tokens.radius.pill }}>pill</div>
        </div>
      </section>
      <section>
        <h2>Button component</h2>
        <div className="storybook-button-token-demo">
          <div className="storybook-button-token-row">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button aria-label="분석 요청" size="icon" variant="send">
              ↑
            </Button>
          </div>
          <div className="storybook-component-token-grid">
            {buttonTokenEntries.map(([name, value]) => (
              <div className="storybook-component-token" key={name}>
                <strong>{name}</strong>
                <code>{value}</code>
              </div>
            ))}
          </div>
          <div className="storybook-component-size-row">
            {buttonSizeEntries.map(([name, value]) => (
              <div className="storybook-component-size" key={name}>
                <span>{name}</span>
                <code>{value}</code>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section>
        <h2>Typography</h2>
        <div className="storybook-type-sample">
          <span className="nado-eyebrow">입력 예시</span>
          <strong>전체 자연스러운 번역</strong>
          <p>
            단순한 구성은 작은 팀이 빠르게 움직이게 도와주지만, 규칙이 흐릿하면
            검토가 더 어려워질 수 있습니다.
          </p>
        </div>
      </section>
    </div>
  ),
};
