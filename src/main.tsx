import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "./globals.css";
import { themes, defaultThemeKey } from "@/themes";
import { App } from "./App";

// GitHub Pages SPA redirect: restore path from 404.html redirect
const params = new URLSearchParams(window.location.search);
const redirect = params.get("redirect");
if (redirect) {
  window.history.replaceState(null, "", redirect);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename="/pos-app">
      <MantineProvider theme={themes[defaultThemeKey]} defaultColorScheme="auto">
        <App />
      </MantineProvider>
    </BrowserRouter>
  </StrictMode>,
);
