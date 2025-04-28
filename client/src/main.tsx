import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App";
import "./index.css";
import "./assets/custom-theme.css";
import "./assets/menu-gradients.css";
import "./assets/transparent-gradients.css";
import "./assets/menu-items-gradient.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
