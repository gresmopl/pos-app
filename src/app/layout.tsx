import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@mantine/core/styles.css";
import "./globals.css";
import { MantineProvider, ColorSchemeScript } from "@mantine/core";
import { themes, defaultThemeKey } from "@/themes";

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
      </head>
      <body>
        <MantineProvider theme={themes[defaultThemeKey]} defaultColorScheme="auto">
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
