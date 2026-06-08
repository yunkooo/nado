import type { Preview } from "@storybook/react-vite";
import "@nado/ui/styles.css";
import "../src/preview.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
