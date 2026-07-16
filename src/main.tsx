import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "./api/queryClient";
import { LocaleProvider } from "./i18n/LocaleProvider";
import { router } from "./router";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./theme/tokens.css";
import "./theme/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LocaleProvider>
          <RouterProvider router={router} />
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
