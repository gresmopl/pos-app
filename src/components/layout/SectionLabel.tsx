import { Text } from "@mantine/core";

export function SectionLabel({ children }: { children: string }): React.JSX.Element {
  return (
    <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
      {children}
    </Text>
  );
}
