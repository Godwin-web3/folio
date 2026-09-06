import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { FolioConvex } from "@/lib/open-address/convex-react";
import "../src/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FolioConvex>
      <RouterProvider router={getRouter()} />
    </FolioConvex>
  </StrictMode>,
);
