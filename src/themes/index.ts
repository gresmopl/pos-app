import { barberClassic } from "./barber-classic";
import type { MantineThemeOverride } from "@mantine/core";

export const themes: Record<string, MantineThemeOverride> = {
  classic: barberClassic,
};

export const defaultThemeKey = "classic";
