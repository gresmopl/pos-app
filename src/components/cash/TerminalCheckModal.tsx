import { useState } from "react";
import { Text, Stack, Box, Modal, NumberInput, Button } from "@mantine/core";

interface TerminalCheckModalProps {
  opened: boolean;
  onClose: () => void;
  expectedCash: number;
  previousTerminalTotal: number;
  onConfirm: (cashAmount: number, terminalAmount: number) => void;
}

export function TerminalCheckModal({
  opened,
  onClose,
  expectedCash,
  previousTerminalTotal,
  onConfirm,
}: TerminalCheckModalProps) {
  const [terminalAmount, setTerminalAmount] = useState<number | string>("");
  const [checked, setChecked] = useState(false);

  const amount = Number(terminalAmount) || 0;
  const adjustedExpected = expectedCash - previousTerminalTotal;
  const cashInDrawer = adjustedExpected - amount;

  const handleCheck = () => {
    setChecked(true);
    onConfirm(cashInDrawer, amount);
  };

  const handleClose = () => {
    setTerminalAmount("");
    setChecked(false);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={700} fz="lg">
          Sprawdź kasę
        </Text>
      }
      size="sm"
    >
      <Stack gap="md">
        <Box
          p="md"
          style={{
            borderRadius: "var(--mantine-radius-md)",
            backgroundColor: "var(--mantine-color-gray-light)",
          }}
        >
          <Text fz="xs" c="dimmed">
            Gotówka i płatność kartą
          </Text>
          <Text fw={700} fz="xl">
            {adjustedExpected.toLocaleString("pl-PL")} zł
          </Text>
          {previousTerminalTotal > 0 && (
            <Text fz="xs" c="dimmed" mt={2}>
              po odjęciu wcześniejszych raportów z terminala (
              {previousTerminalTotal.toLocaleString("pl-PL")} zł)
            </Text>
          )}
        </Box>

        <NumberInput
          label="Kwota z raportu terminala (karty)"
          description="Administracja → Raporty na terminalu"
          placeholder="0"
          data-autofocus
          value={terminalAmount}
          onChange={setTerminalAmount}
          min={0}
          suffix=" zł"
          size="md"
          onFocus={(event) => event.currentTarget.select()}
        />

        {!checked ? (
          <Button fullWidth size="lg" onClick={handleCheck} disabled={!Number(terminalAmount)}>
            Oblicz gotówkę
          </Button>
        ) : (
          <Box
            p="md"
            style={{
              borderRadius: "var(--mantine-radius-md)",
              textAlign: "center",
              backgroundColor:
                cashInDrawer < 0
                  ? "var(--mantine-color-red-light)"
                  : "var(--mantine-color-green-light)",
              border: `2px solid ${cashInDrawer < 0 ? "var(--mantine-color-red-filled)" : "var(--mantine-color-green-filled)"}`,
            }}
          >
            <Text fz="xs" c="dimmed">
              {cashInDrawer < 0
                ? "Kwota terminala przekracza sprzedaż. Sprawdź kwotę."
                : "Gotówka w kasie powinna wynosić"}
            </Text>
            <Text fw={700} fz={32} c={cashInDrawer < 0 ? "red" : "green"}>
              {cashInDrawer.toLocaleString("pl-PL")} zł
            </Text>
          </Box>
        )}

        {checked && (
          <Button fullWidth size="lg" variant="light" onClick={handleClose}>
            Zamknij
          </Button>
        )}
      </Stack>
    </Modal>
  );
}
