import { createTheme } from "@mantine/core";

export const barberClassic = createTheme({
  primaryColor: "green",
  defaultRadius: "md",
  fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: "700",
  },
  fontSizes: {
    xs: "0.8125rem",
    sm: "0.9375rem",
    md: "1.0625rem",
    lg: "1.25rem",
    xl: "1.5rem",
  },
  spacing: {
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
  colors: {
    green: [
      "#e6fff2",
      "#b3ffd9",
      "#80ffc1",
      "#4dffa8",
      "#1aff8f",
      "#00e676",
      "#00b35e",
      "#008045",
      "#004d2d",
      "#001a14",
    ],
  },
  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
    },
    Card: {
      defaultProps: {
        radius: "md",
      },
    },
    NumberInput: {
      styles: {
        description: { color: "var(--mantine-color-text)" },
      },
    },
    TextInput: {
      styles: {
        description: { color: "var(--mantine-color-text)" },
      },
    },
    Select: {
      styles: {
        description: { color: "var(--mantine-color-text)" },
      },
    },
  },
});
