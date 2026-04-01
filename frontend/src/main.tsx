import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { initSentry } from "./lib/sentry";
import App from "./App";

// Must run before React renders so Sentry can wrap the component tree
initSentry();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
