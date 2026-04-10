import { Text, Group, Stack, ActionIcon, Divider } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import type { CartItem } from "@/lib/types";

interface CartItemListProps {
  items: CartItem[];
  onUpdateQuantity: (cartId: string, delta: number) => void;
  onRemove: (cartId: string) => void;
}

export function CartItemList({ items, onUpdateQuantity, onRemove }: CartItemListProps) {
  if (items.length === 0) {
    return (
      <Text fz="sm" ta="center" py="xl">
        Koszyk jest pusty. Dodaj usługę lub produkt.
      </Text>
    );
  }

  return (
    <Stack gap={0}>
      {items.map((item, index) => (
        <div key={item.cartId}>
          <Group justify="space-between" py="sm" wrap="nowrap">
            <div style={{ minWidth: 0 }}>
              <Text fw={500} fz="md">
                {item.name}
              </Text>
              <Text fz="xs" c="dimmed">
                {item.type === "service" ? "Usługa" : "Produkt"}
                {item.quantity > 1 && ` · ${item.price.toLocaleString("pl-PL")} zł/szt.`}
              </Text>
            </div>
            <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
              <ActionIcon
                variant="light"
                color="gray"
                size="sm"
                onClick={() => onUpdateQuantity(item.cartId, -1)}
                aria-label="Mniej"
              >
                <Text fz="sm" fw={700}>
                  −
                </Text>
              </ActionIcon>
              <Text fw={600} fz="sm" w={20} ta="center">
                {item.quantity}
              </Text>
              <ActionIcon
                variant="light"
                color="gray"
                size="sm"
                onClick={() => onUpdateQuantity(item.cartId, 1)}
                aria-label="Więcej"
              >
                <Text fz="sm" fw={700}>
                  +
                </Text>
              </ActionIcon>
              <Text fw={600} fz="md" w={70} ta="right">
                {(item.price * item.quantity).toLocaleString("pl-PL")} zł
              </Text>
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                onClick={() => onRemove(item.cartId)}
                aria-label="Usuń"
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Group>
          {index < items.length - 1 && <Divider />}
        </div>
      ))}
    </Stack>
  );
}
