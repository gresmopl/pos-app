import { useState, useId } from "react";
import { Text, Group, Stack, Box, NumberInput, SegmentedControl, Button } from "@mantine/core";
import { IconGift, IconCheck } from "@tabler/icons-react";

interface VoucherTabProps {
  onSale: (amount: number, payment: string, code: string) => void;
}

export function VoucherTab({ onSale }: VoucherTabProps) {
  const paymentId = useId();
  const [value, setValue] = useState<number | string>("");
  const [payment, setPayment] = useState("cash");
  const [success, setSuccess] = useState(false);
  const [code, setCode] = useState("");

  const handleSale = () => {
    const amount = Number(value);
    if (!amount || amount <= 0) return;

    const generatedCode = `BON-${Date.now().toString(36).toUpperCase()}`;
    setCode(generatedCode);
    setSuccess(true);
    onSale(amount, payment, generatedCode);
  };

  const reset = () => {
    setValue("");
    setPayment("cash");
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
          <Text fw={700} fz={22} style={{ letterSpacing: 2 }}>
            {code}
          </Text>
          <Text fz="sm" c="dimmed" mt="xs">
            Wartość: {Number(value).toLocaleString("pl-PL")} zł ·{" "}
            {payment === "cash" ? "Gotówka" : "Karta"}
          </Text>
        </Box>
        <Button size="lg" fullWidth variant="light" onClick={reset}>
          Sprzedaj kolejny bon
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="md" py="md">
      <div>
        <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1} mb="xs">
          Sprzedaż bonu podarunkowego
        </Text>
        <Text fz="sm" mb="md">
          Bon nie jest przypisany do fryzjera - wpływa do kasy salonu.
        </Text>
      </div>

      <NumberInput
        label="Kwota bonu"
        placeholder="0"
        value={value}
        onChange={setValue}
        min={1}
        suffix=" zł"
        size="md"
      />

      <SegmentedControl
        id={paymentId}
        fullWidth
        value={payment}
        onChange={setPayment}
        data={[
          { label: "Gotówka", value: "cash" },
          { label: "Karta", value: "card" },
        ]}
      />

      <Button
        size="lg"
        color="green"
        fullWidth
        disabled={!Number(value)}
        onClick={handleSale}
        leftSection={<IconGift size={20} />}
      >
        Sprzedaj bon - {Number(value) || 0} zł
      </Button>
    </Stack>
  );
}
