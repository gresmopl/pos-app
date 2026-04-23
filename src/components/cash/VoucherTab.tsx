import { useState } from "react";
import { Text, Stack, Box, NumberInput, Button, CopyButton } from "@mantine/core";
import { SectionLabel } from "@/components/layout/SectionLabel";
import { IconGift, IconCheck, IconCopy } from "@tabler/icons-react";

interface VoucherTabProps {
  onSale: (amount: number, code: string) => void;
}

export function VoucherTab({ onSale }: VoucherTabProps) {
  const [value, setValue] = useState<number | string>("");
  const [success, setSuccess] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSale = () => {
    const amount = Number(value);
    if (!amount || amount <= 0) {
      setError("Podaj kwotę bonu");
      return;
    }
    setError(null);

    const generatedCode = `BON-${Date.now().toString(36).toUpperCase()}`;
    setCode(generatedCode);
    setSuccess(true);
    onSale(amount, generatedCode);
  };

  const reset = () => {
    setValue("");
    setSuccess(false);
    setCode("");
  };

  if (success) {
    return (
      <Stack align="center" gap="md" py="xl">
        <Box
          p="md"
          style={{
            borderRadius: "50%",
            backgroundColor: "var(--mantine-color-green-light)",
          }}
        >
          <IconCheck size={40} color="var(--mantine-color-green-filled)" />
        </Box>
        <Text fw={700} fz={24}>
          Bon sprzedany!
        </Text>
        <Box
          p="md"
          w="100%"
          style={{
            borderRadius: "var(--mantine-radius-md)",
            border: "1px solid var(--mantine-color-default-border)",
            textAlign: "center",
          }}
        >
          <Text fz="xs" c="dimmed">
            Kod bonu
          </Text>
          <Text fw={700} fz="xl" style={{ letterSpacing: 2 }}>
            {code}
          </Text>
          <Text fz="sm" c="dimmed" mt="xs">
            Wartość: {Number(value).toLocaleString("pl-PL")} zł
          </Text>
        </Box>
        <CopyButton value={code}>
          {({ copied, copy }) => (
            <Button
              size="md"
              fullWidth
              variant="light"
              color={copied ? "green" : "gray"}
              leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              onClick={copy}
            >
              {copied ? "Skopiowano!" : "Kopiuj kod"}
            </Button>
          )}
        </CopyButton>
        <Button size="lg" fullWidth variant="light" onClick={reset}>
          Sprzedaj kolejny bon
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="md" py="md">
      <SectionLabel>Sprzedaż bonu podarunkowego</SectionLabel>
      <Text fz="sm">Bon nie jest przypisany do fryzjera - wpływa do kasy salonu.</Text>

      <NumberInput
        label="Kwota bonu"
        placeholder="0"
        value={value}
        onChange={(v) => {
          setValue(v);
          setError(null);
        }}
        min={1}
        suffix=" zł"
        error={error}
      />

      <Button
        size="lg"
        color="green"
        fullWidth
        onClick={handleSale}
        leftSection={<IconGift size={20} />}
      >
        Sprzedaj bon - {Number(value) || 0} zł
      </Button>
    </Stack>
  );
}
