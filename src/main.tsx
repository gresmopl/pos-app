import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "dayjs/locale/pl";
import "./globals.css";
import { themes, defaultThemeKey } from "@/themes";
import { DeviceProvider } from "@/contexts/DeviceContext";
import { App } from "./App";

// GitHub Pages SPA redirect: restore path from 404.html redirect
const params = new URLSearchParams(window.location.search);
const redirect = params.get("redirect");
if (redirect) {
  window.history.replaceState(null, "", redirect);
}

// Detect GitHub Pages by pathname prefix
const isGitHubPages = window.location.pathname.startsWith("/pos-app");
const basename = isGitHubPages ? "/pos-app" : "/";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <MantineProvider theme={themes[defaultThemeKey]} defaultColorScheme="auto">
        <DatesProvider settings={{ locale: "pl" }}>
          <Notifications position="top-center" autoClose={3000} />
          <ModalsProvider>
            <DeviceProvider>
              <App />
            </DeviceProvider>
          </ModalsProvider>
        </DatesProvider>
      </MantineProvider>
    </BrowserRouter>
  </StrictMode>
);
