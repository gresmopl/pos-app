import { Text, Group, Stack, ActionIcon, Divider } from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import type { CartItem } from "@/lib/types";

interface CartItemListProps {
  items: CartItem[];
  onUpdateQuantity: (cartId: string, delta: number) => void;
  onEditPrice: (item: CartItem) => void;
  onRemove: (cartId: string) => void;
}

export function CartItemList({
  items,
  onUpdateQuantity,
  onEditPrice,
  onRemove,
}: CartItemListProps) {
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
          <Stack gap="xs" py="sm">
            <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
              <div style={{ minWidth: 0 }}>
                <Text fw={500} fz="md" truncate>
                  {item.name}
                </Text>
                <Text fz="xs" c="dimmed">
                  {item.type === "service" ? "Usługa" : "Produkt"}
                  {item.quantity > 1 && ` · ${item.price.toLocaleString("pl-PL")} zł/szt.`}
                </Text>
              </div>
              <Text fw={700} fz="md" style={{ flexShrink: 0 }}>
                {(item.price * item.quantity).toLocaleString("pl-PL")} zł
              </Text>
            </Group>
            <Group justify="space-between" wrap="nowrap">
              <Group gap="xs" wrap="nowrap">
                <ActionIcon
                  variant="light"
                  color="gray"
                  size="lg"
                  onClick={() => onUpdateQuantity(item.cartId, -1)}
                  aria-label="Mniej"
                >
                  <Text fz="md" fw={700}>
                    −
                  </Text>
                </ActionIcon>
                <Text fw={600} fz="md" w={28} ta="center">
                  {item.quantity}
                </Text>
                <ActionIcon
                  variant="light"
                  color="gray"
                  size="lg"
                  onClick={() => onUpdateQuantity(item.cartId, 1)}
                  aria-label="Więcej"
                >
                  <Text fz="md" fw={700}>
                    +
                  </Text>
                </ActionIcon>
              </Group>
              <Group gap="xs" wrap="nowrap">
                <ActionIcon
                  variant="light"
                  color="green"
                  size="lg"
                  onClick={() => onEditPrice(item)}
                  aria-label={`Zmień cenę ${item.type === "service" ? "usługi" : "produktu"} ${item.name}`}
                >
                  <IconPencil size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="lg"
                  onClick={() => onRemove(item.cartId)}
                  aria-label="Usuń"
                >
                  <IconTrash size={20} />
                </ActionIcon>
              </Group>
            </Group>
          </Stack>
          {index < items.length - 1 && <Divider />}
        </div>
      ))}
    </Stack>
  );
}
