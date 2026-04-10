import { useState } from "react";
import { Text, Group, Stack, Box, Modal, NumberInput, Button } from "@mantine/core";
import {
  IconCash,
  IconCreditCard,
  IconDeviceMobile,
  IconGift,
  IconArrowsSplit,
} from "@tabler/icons-react";

interface PaymentModalProps {
  opened: boolean;
  onClose: () => void;
  total: number;
  onSelectMethod: (method: string, details?: string) => void;
  onOpenSplit: () => void;
}

export function PaymentModal({
  opened,
  onClose,
  total,
  onSelectMethod,
  onOpenSplit,
}: PaymentModalProps) {
  const [voucherStep, setVoucherStep] = useState(false);
  const [voucherAmount, setVoucherAmount] = useState<number | string>("");

  const handleClose = () => {
    onClose();
    setVoucherStep(false);
    setVoucherAmount("");
  };

  const formatPLN = (val: number) => val.toLocaleString("pl-PL", { minimumFractionDigits: 2 });
  const voucherVal = Number(voucherAmount) || 0;

  if (!voucherStep) {
    return (
      <Modal
        opened={opened}
        onClose={handleClose}
        title={
          <Text fw={700} fz="lg">
            Płatność
          </Text>
        }
        size="sm"
      >
        <Box mb="lg" ta="center">
          <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
            Do zapłaty
          </Text>
          <Text fw={700} fz={36}>
            {formatPLN(total)} zł
          </Text>
        </Box>
        <Stack gap="sm">
          <Button
            fullWidth
            size="lg"
            variant="light"
            color="green"
            leftSection={<IconCash size={22} />}
            onClick={() => onSelectMethod("Gotówka")}
          >
            Gotówka
          </Button>
          <Button
            fullWidth
            size="lg"
            variant="light"
            color="blue"
            leftSection={<IconCreditCard size={22} />}
            onClick={() => onSelectMethod("Karta")}
          >
            Karta
          </Button>
          <Button
            fullWidth
            size="lg"
            variant="light"
            color="pink"
            leftSection={<IconDeviceMobile size={22} />}
            onClick={() => onSelectMethod("BLIK")}
          >
            BLIK
          </Button>
          <Button
            fullWidth
            size="lg"
            variant="light"
            color="gray"
            leftSection={<IconArrowsSplit size={22} />}
            onClick={onOpenSplit}
          >
            Gotówka + Karta
          </Button>
          <Button
            fullWidth
            size="lg"
            variant="light"
            color="yellow"
            leftSection={<IconGift size={22} />}
            onClick={() => {
              setVoucherStep(true);
              setVoucherAmount("");
            }}
          >
            Bon podarunkowy
          </Button>
        </Stack>
      </Modal>
    );
  }

  const remainder = total - voucherVal;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={700} fz="lg">
          Płatność
        </Text>
      }
      size="sm"
    >
      <Stack gap="md">
        <Box ta="center" mb="sm">
          <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
            Do zapłaty
          </Text>
          <Text fw={700} fz={28}>
            {formatPLN(total)} zł
          </Text>
        </Box>

        <NumberInput
          label="Wartość bonu"
          placeholder="Wpisz kwotę bonu"
          value={voucherAmount}
          onChange={setVoucherAmount}
          min={0}
          suffix=" zł"
          size="md"
        />

        {voucherVal > 0 && voucherVal < total && (
          <Box
            p="md"
            style={{
              borderRadius: "var(--mantine-radius-md)",
              border: "1px solid var(--mantine-color-default-border)",
            }}
          >
            <Text fz="sm" fw={500} mb="xs">
              Dopłata:{" "}
              <Text span fw={700}>
                {formatPLN(remainder)} zł
              </Text>
            </Text>
            <Text fz="xs" c="dimmed" mb="sm">
              Wybierz metodę dopłaty:
            </Text>
            <Group gap="sm">
              <Button
                variant="light"
                color="green"
                size="xs"
                leftSection={<IconCash size={16} />}
                onClick={() =>
                  onSelectMethod(
                    "Bon + Gotówka",
                    `Bon: ${voucherVal.toLocaleString("pl-PL")} zł, Gotówka: ${formatPLN(remainder)} zł`
                  )
                }
              >
                Gotówka
              </Button>
              <Button
                variant="light"
                color="blue"
                size="xs"
                leftSection={<IconCreditCard size={16} />}
                onClick={() =>
                  onSelectMethod(
                    "Bon + Karta",
                    `Bon: ${voucherVal.toLocaleString("pl-PL")} zł, Karta: ${formatPLN(remainder)} zł`
                  )
                }
              >
                Karta
              </Button>
              <Button
                variant="light"
                color="pink"
                size="xs"
                leftSection={<IconDeviceMobile size={16} />}
                onClick={() =>
                  onSelectMethod(
                    "Bon + BLIK",
                    `Bon: ${voucherVal.toLocaleString("pl-PL")} zł, BLIK: ${formatPLN(remainder)} zł`
                  )
                }
              >
                BLIK
              </Button>
            </Group>
          </Box>
        )}

        {voucherVal >= total && voucherVal > 0 && (
          <Box
            p="md"
            style={{
              borderRadius: "var(--mantine-radius-md)",
              backgroundColor: "var(--mantine-color-green-light)",
            }}
          >
            <Text fz="sm" c="green" fw={500}>
              Bon pokrywa całą kwotę
              {voucherVal > total && (
                <Text span fz="xs" c="dimmed">
                  {" "}
                  (reszta na bonie: {formatPLN(voucherVal - total)} zł)
                </Text>
              )}
            </Text>
          </Box>
        )}

        <Group>
          <Button variant="subtle" onClick={() => setVoucherStep(false)}>
            Wstecz
          </Button>
          <Button
            flex={1}
            size="lg"
            color="yellow"
            disabled={!voucherVal}
            leftSection={<IconGift size={20} />}
            onClick={() => {
              if (voucherVal >= total)
                onSelectMethod("Bon podarunkowy", `Bon: ${voucherVal.toLocaleString("pl-PL")} zł`);
            }}
          >
            {voucherVal >= total ? "Zapłać bonem" : "Wpisz kwotę bonu"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
