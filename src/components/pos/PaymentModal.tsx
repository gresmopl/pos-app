import { useState } from "react";
import {
  Text,
  Group,
  Stack,
  Box,
  Modal,
  NumberInput,
  TextInput,
  Button,
  Loader,
} from "@mantine/core";
import {
  IconCash,
  IconCreditCard,
  IconDeviceMobile,
  IconGift,
  IconArrowsSplit,
} from "@tabler/icons-react";
import { db } from "@/db";
import type { Voucher } from "@/lib/types";

interface PaymentModalProps {
  opened: boolean;
  onClose: () => void;
  total: number;
  onSelectMethod: (
    method: string,
    details?: string,
    voucherCode?: string,
    voucherAmount?: number
  ) => void;
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
  const [voucherCode, setVoucherCode] = useState("");
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  const handleClose = () => {
    onClose();
    resetVoucher();
  };

  const resetVoucher = () => {
    setVoucherStep(false);
    setVoucherCode("");
    setVoucher(null);
    setVoucherError(null);
  };

  const formatPLN = (val: number) => val.toLocaleString("pl-PL", { minimumFractionDigits: 2 });

  const handleCheckVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherLoading(true);
    setVoucherError(null);
    setVoucher(null);
    try {
      const found = await db.vouchers.getByCode(voucherCode.trim().toUpperCase());
      if (!found) {
        setVoucherError("Nie znaleziono bonu o tym kodzie");
      } else if (found.status === "used") {
        setVoucherError("Bon został już wykorzystany");
      } else if (found.status === "expired" || new Date(found.expiresAt) < new Date()) {
        setVoucherError("Bon wygasł");
      } else if (found.remainingBalance <= 0) {
        setVoucherError("Bon ma zerowe saldo");
      } else {
        setVoucher(found);
      }
    } catch {
      setVoucherError("Błąd podczas sprawdzania bonu");
    } finally {
      setVoucherLoading(false);
    }
  };

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
              setVoucher(null);
              setVoucherCode("");
              setVoucherError(null);
            }}
          >
            Bon podarunkowy
          </Button>
        </Stack>
      </Modal>
    );
  }

  // Voucher step: enter code, validate, pay
  const voucherVal = voucher?.remainingBalance ?? 0;
  const remainder = total - voucherVal;
  const coversAll = voucherVal >= total;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={700} fz="lg">
          Płatność bonem
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

        <TextInput
          label="Kod bonu"
          placeholder="np. BON-1712345678"
          value={voucherCode}
          onChange={(e) => {
            setVoucherCode(e.currentTarget.value);
            setVoucher(null);
            setVoucherError(null);
          }}
          size="md"
          error={voucherError}
          rightSection={voucherLoading ? <Loader size={16} /> : undefined}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCheckVoucher();
          }}
        />

        {!voucher && (
          <Button
            variant="light"
            size="lg"
            onClick={handleCheckVoucher}
            loading={voucherLoading}
            disabled={!voucherCode.trim()}
          >
            Sprawdź bon
          </Button>
        )}

        {voucher && (
          <>
            <Box
              p="md"
              style={{
                borderRadius: "var(--mantine-radius-md)",
                backgroundColor: coversAll
                  ? "var(--mantine-color-green-light)"
                  : "var(--mantine-color-yellow-light)",
              }}
            >
              <Group justify="space-between" mb={4}>
                <Text fz="sm">Saldo bonu:</Text>
                <Text fz="sm" fw={700}>
                  {formatPLN(voucherVal)} zł
                </Text>
              </Group>
              {coversAll ? (
                <Text fz="sm" c="green" fw={500}>
                  Bon pokrywa całą kwotę
                  {voucherVal > total && (
                    <Text span fz="xs" c="dimmed">
                      {" "}
                      (reszta na bonie: {formatPLN(voucherVal - total)} zł)
                    </Text>
                  )}
                </Text>
              ) : (
                <Text fz="sm" fw={500}>
                  Dopłata:{" "}
                  <Text span fw={700}>
                    {formatPLN(remainder)} zł
                  </Text>
                </Text>
              )}
            </Box>

            {coversAll ? (
              <Button
                fullWidth
                size="lg"
                color="yellow"
                leftSection={<IconGift size={20} />}
                onClick={() =>
                  onSelectMethod(
                    "Bon podarunkowy",
                    `Bon ${voucher.code}: ${formatPLN(Math.min(voucherVal, total))} zł`,
                    voucher.code,
                    Math.min(voucherVal, total)
                  )
                }
              >
                Zapłać bonem
              </Button>
            ) : (
              <>
                <Text fz="xs" c="dimmed">
                  Wybierz metodę dopłaty:
                </Text>
                <Stack gap="xs">
                  <Button
                    fullWidth
                    variant="light"
                    color="green"
                    size="md"
                    leftSection={<IconCash size={20} />}
                    onClick={() =>
                      onSelectMethod(
                        "Bon + Gotówka",
                        `Bon ${voucher.code}: ${formatPLN(voucherVal)} zł, Gotówka: ${formatPLN(remainder)} zł`,
                        voucher.code,
                        voucherVal
                      )
                    }
                  >
                    Gotówka
                  </Button>
                  <Button
                    fullWidth
                    variant="light"
                    color="blue"
                    size="md"
                    leftSection={<IconCreditCard size={20} />}
                    onClick={() =>
                      onSelectMethod(
                        "Bon + Karta",
                        `Bon ${voucher.code}: ${formatPLN(voucherVal)} zł, Karta: ${formatPLN(remainder)} zł`,
                        voucher.code,
                        voucherVal
                      )
                    }
                  >
                    Karta
                  </Button>
                  <Button
                    fullWidth
                    variant="light"
                    color="pink"
                    size="md"
                    leftSection={<IconDeviceMobile size={20} />}
                    onClick={() =>
                      onSelectMethod(
                        "Bon + BLIK",
                        `Bon ${voucher.code}: ${formatPLN(voucherVal)} zł, BLIK: ${formatPLN(remainder)} zł`,
                        voucher.code,
                        voucherVal
                      )
                    }
                  >
                    BLIK
                  </Button>
                </Stack>
              </>
            )}
          </>
        )}

        <Button variant="subtle" onClick={resetVoucher}>
          Wstecz
        </Button>
      </Stack>
    </Modal>
  );
}
