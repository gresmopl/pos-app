import { useState, useId, useEffect } from "react";
import { Text, Group, Stack, Modal, NumberInput, Button, SegmentedControl } from "@mantine/core";
import type { DiscountState } from "@/lib/types";

interface DiscountModalProps {
  opened: boolean;
  onClose: () => void;
  discount: DiscountState | null;
  subtotal: number;
  onApply: (discount: DiscountState | null) => void;
}

export function DiscountModal({
  opened,
  onClose,
  discount,
  subtotal,
  onApply,
}: DiscountModalProps) {
  const tabId = useId();
  const [type, setType] = useState<"percent" | "amount">(discount?.type || "percent");
  const [value, setValue] = useState<number | string>(discount?.value || 0);

  useEffect(() => {
    if (opened) {
      setType(discount?.type || "percent");
      setValue(discount?.value || 0);
    }
  }, [opened, discount]);

  const handleApply = () => {
    const val = Number(value);
    onApply(val > 0 ? { type, value: val } : null);
    onClose();
  };

  const handleClear = () => {
    onApply(null);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} fz="lg">
          Rabat
        </Text>
      }
      size="sm"
    >
      <Stack gap="md">
        <SegmentedControl
          id={tabId}
          fullWidth
          value={type}
          onChange={(val) => setType(val as "percent" | "amount")}
          data={[
            { label: "Procentowy (%)", value: "percent" },
            { label: "Kwotowy (zł)", value: "amount" },
          ]}
        />
        <NumberInput
          label={type === "percent" ? "Procent rabatu" : "Kwota rabatu (zł)"}
          data-autofocus
          value={value}
          onChange={setValue}
          min={0}
          max={type === "percent" ? 100 : subtotal}
          suffix={type === "percent" ? "%" : " zł"}
        />
        <Group justify="space-between">
          <Button variant="subtle" color="red" size="lg" onClick={handleClear}>
            Usuń rabat
          </Button>
          <Button size="lg" onClick={handleApply}>
            Zastosuj
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
