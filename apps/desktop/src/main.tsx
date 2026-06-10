import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@nado/ui/styles.css";
import "./styles/styles.css";
import { App } from "./app/App";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
