import { createApp } from "./app/createApp.js";
import {
  resolveApiPort,
  validateApiRuntimeConfig,
} from "./infrastructure/env/apiRuntimeConfig.js";

validateApiRuntimeConfig();
const port = resolveApiPort();
const app = createApp();

app.listen(port, () => {
  console.log(`nado API listening on http://localhost:${port}`);
});
