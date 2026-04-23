import { useLocation, useNavigate } from "react-router";
import { UnstyledButton, Text, Box, Group } from "@mantine/core";
import { IconScissors, IconCash, IconCoins, IconDots } from "@tabler/icons-react";

const NAV_ITEMS = [
  { label: "Sprzedaż", icon: IconScissors, path: "/" },
  { label: "Kasa", icon: IconCash, path: "/cash" },
  { label: "Napiwki", icon: IconCoins, path: "/wallet" },
  { label: "Więcej", icon: IconDots, path: "/more" },
] as const;

function isActive(currentPath: string, itemPath: string): boolean {
  if (itemPath === "/") return currentPath === "/";
  return currentPath.startsWith(itemPath);
}

export function BottomNavBar(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Box
      component="nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        borderTop: "1px solid var(--mantine-color-default-border)",
        backgroundColor: "var(--mantine-color-body)",
      }}
    >
      <Group grow gap={4} h={60} px={4}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(location.pathname, item.path);
          return (
            <UnstyledButton
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 2,
              }}
            >
              <item.icon
                size={22}
                stroke={active ? 2.5 : 1.5}
                color={active ? "var(--mantine-color-blue-filled)" : "var(--mantine-color-dimmed)"}
              />
              <Text fz={11} fw={active ? 600 : 400} c={active ? "blue" : "dimmed"} lh={1}>
                {item.label}
              </Text>
            </UnstyledButton>
          );
        })}
      </Group>
    </Box>
  );
}

export const BOTTOM_NAV_HEIGHT = 60;
export const PAGE_BOTTOM_PADDING = BOTTOM_NAV_HEIGHT + 16;
