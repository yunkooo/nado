import type { Meta, StoryObj } from "@storybook/react-vite";
import { tokens } from "@nado/ui";

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
