import { Text, Group, Stack, Box, Modal, Button } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import type { DiscountState } from "@/lib/types";
import { SectionLabel } from "@/components/layout/SectionLabel";

interface ConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  total: number;
  employeeName: string;
  itemCount: number;
  tipAmount: number;
  discount: DiscountState | null;
  discountAmount: number;
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmModal({
  opened,
  onClose,
  total,
  employeeName,
  itemCount,
  tipAmount,
  discount,
  discountAmount,
  onConfirm,
  loading,
}: ConfirmModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} fz="lg">
          Potwierdzenie płatności
        </Text>
      }
      size="sm"
    >
      <Stack gap="md">
        <Box ta="center" py="sm">
          <SectionLabel>Do zapłaty</SectionLabel>
          <Text fw={700} fz={36}>
            {total.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł
          </Text>
        </Box>

        <Box
          p="md"
          style={{
            borderRadius: "var(--mantine-radius-md)",
            border: "1px solid var(--mantine-color-default-border)",
          }}
        >
          <Stack gap={4}>
            <Group justify="space-between">
              <Text fz="sm">Fryzjer:</Text>
              <Text fz="sm" fw={600}>
                {employeeName}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fz="sm">Pozycje:</Text>
              <Text fz="sm" fw={600}>
                {itemCount}
              </Text>
            </Group>
            {tipAmount > 0 && (
              <Group justify="space-between">
                <Text fz="sm">Napiwek:</Text>
                <Text fz="sm" fw={600} c="green">
                  {tipAmount.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
            )}
            {discount && (
              <Group justify="space-between">
                <Text fz="sm">Rabat:</Text>
                <Text fz="sm" fw={600} c="red">
                  -{discountAmount.toLocaleString("pl-PL")} zł
                  {discount.type === "percent" && ` (${discount.value}%)`}
                </Text>
              </Group>
            )}
          </Stack>
        </Box>

        <Group justify="flex-end">
          <Button variant="subtle" size="lg" onClick={onClose}>
            Anuluj
          </Button>
          <Button
            color="green"
            size="lg"
            leftSection={<IconCheck size={20} />}
            onClick={onConfirm}
            loading={loading}
          >
            Potwierdź
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
