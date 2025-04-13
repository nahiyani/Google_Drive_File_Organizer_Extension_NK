import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import "..//content-component/ContentApp.css";
import ContentApp from "./ContentApp.js";

const rootDiv = document.createElement("div");
rootDiv.id = "gdfo-root";
document.body.appendChild(rootDiv);

createRoot(rootDiv).render(
  <StrictMode>
    <ContentApp />
  </StrictMode>
);
