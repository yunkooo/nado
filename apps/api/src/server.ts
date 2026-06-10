import { app } from "./app/createApp.js";

const port = Number(process.env.NADO_API_PORT ?? process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`nado API listening on http://localhost:${port}`);
});
