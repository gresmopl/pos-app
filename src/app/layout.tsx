import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@mantine/core/styles.css";
import "./globals.css";
import { MantineProvider, ColorSchemeScript } from "@mantine/core";
import { themes, defaultThemeKey } from "@/themes";
import { SwipeBack } from "@/components/SwipeBack";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FORMEN",
  description: "System POS dla salonów fryzjerskich",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={inter.variable} suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00e676" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body>
        <MantineProvider theme={themes[defaultThemeKey]} defaultColorScheme="auto">
          <SwipeBack />
          <ServiceWorkerRegistration />
          <div className="page-transition">{children}</div>
        </MantineProvider>
      </body>
    </html>
  );
}
