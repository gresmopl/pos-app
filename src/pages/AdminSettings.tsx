import { useState, useEffect } from "react";
import { useForm } from "@mantine/form";
import { useSalonSettings } from "@/hooks/useDbData";
import { db } from "@/db";
import {
  Text,
  Group,
  Stack,
  Box,
  Container,
  Divider,
  TextInput,
  NumberInput,
  Textarea,
  Checkbox,
  Switch,
  Button,
  Skeleton,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { PageHeader } from "@/components/layout/PageHeader";

const ALL_PAYMENT_METHODS = [
  { value: "cash", label: "Gotówka" },
  { value: "card", label: "Karta" },
  { value: "blik", label: "BLIK" },
];

function SectionLabel({ children }: { children: string }): React.JSX.Element {
  return (
    <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
      {children}
    </Text>
  );
}

export default function AdminSettingsPage(): React.JSX.Element {
  const { data: salon, loading } = useSalonSettings();
  const [saving, setSaving] = useState(false);

  const form = useForm({
    initialValues: {
      name: "",
      address: "",
      phone: "",
      nip: "",
      cashTolerance: 10 as number | string,
      monthTarget: 600 as number | string,
      voucherExpiryMonths: 12 as number | string,
      voucherMinAmount: 1 as number | string,
      voucherCodePrefix: "BON-",
      defaultCommissionService: 40 as number | string,
      defaultCommissionProduct: 20 as number | string,
      enabledPaymentMethods: ["cash", "card", "blik"] as string[],
      receiptFooter: "",
      knowledgeBaseEnabled: false,
    },
    validate: {
      name: (v) => (v.trim() ? null : "Nazwa jest wymagana"),
      cashTolerance: (v) => (Number(v) >= 0 ? null : "Wartość >= 0"),
      monthTarget: (v) => (Number(v) > 0 ? null : "Wartość > 0"),
      voucherExpiryMonths: (v) => (Number(v) > 0 ? null : "Wartość > 0"),
      voucherMinAmount: (v) => (Number(v) > 0 ? null : "Wartość > 0"),
      voucherCodePrefix: (v) => (v.trim() ? null : "Prefiks wymagany"),
      defaultCommissionService: (v) => (Number(v) >= 0 && Number(v) <= 100 ? null : "0-100%"),
      defaultCommissionProduct: (v) => (Number(v) >= 0 && Number(v) <= 100 ? null : "0-100%"),
      enabledPaymentMethods: (v) => (v.length > 0 ? null : "Wybierz min. 1 metodę"),
    },
  });

  useEffect(() => {
    if (!salon) return;
    form.setValues({
      name: salon.name,
      address: salon.address,
      phone: salon.phone,
      nip: salon.nip,
      cashTolerance: salon.cashTolerance,
      monthTarget: salon.monthTarget,
      voucherExpiryMonths: salon.voucherExpiryMonths,
      voucherMinAmount: salon.voucherMinAmount,
      voucherCodePrefix: salon.voucherCodePrefix,
      defaultCommissionService: salon.defaultCommissionService,
      defaultCommissionProduct: salon.defaultCommissionProduct,
      enabledPaymentMethods: salon.enabledPaymentMethods,
      receiptFooter: salon.receiptFooter,
      knowledgeBaseEnabled: salon.knowledgeBaseEnabled,
    });
    form.resetDirty();
  }, [salon]);

  const handleSave = async (): Promise<void> => {
    if (form.validate().hasErrors) return;
    setSaving(true);
    try {
      const v = form.values;
      await db.salon.update({
        name: v.name,
        address: v.address,
        phone: v.phone,
        nip: v.nip,
        cashTolerance: Number(v.cashTolerance),
        monthTarget: Number(v.monthTarget),
        voucherExpiryMonths: Number(v.voucherExpiryMonths),
        voucherMinAmount: Number(v.voucherMinAmount),
        voucherCodePrefix: v.voucherCodePrefix,
        defaultCommissionService: Number(v.defaultCommissionService),
        defaultCommissionProduct: Number(v.defaultCommissionProduct),
        enabledPaymentMethods: v.enabledPaymentMethods,
        receiptFooter: v.receiptFooter,
        knowledgeBaseEnabled: v.knowledgeBaseEnabled,
      });
      form.resetDirty();
      notifications.show({
        message: "Ustawienia zapisane",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error("[AdminSettings] Save failed:", err);
      notifications.show({ message: "Błąd zapisu", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box mih="100vh">
        <Container size="lg">
          <PageHeader title="Ustawienia" backTo="/admin" />
          <Divider />
          <Stack gap="md" py="md">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={40} />
            ))}
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box mih="100vh" pb={100}>
      <Container size="lg">
        <PageHeader title="Ustawienia" backTo="/admin" />

        <Divider />

        {/* === DANE SALONU === */}
        <Stack gap="sm" py="sm">
          <SectionLabel>Dane salonu</SectionLabel>
          <TextInput label="Nazwa salonu" placeholder="FORMEN" {...form.getInputProps("name")} />
          <TextInput
            label="Adres"
            placeholder="ul. Przykładowa 1, 00-001 Warszawa"
            {...form.getInputProps("address")}
          />
          <Group grow>
            <TextInput
              label="Telefon"
              placeholder="+48 123 456 789"
              {...form.getInputProps("phone")}
            />
            <TextInput
              label="NIP"
              placeholder="1234567890"
              maxLength={13}
              {...form.getInputProps("nip")}
            />
          </Group>
        </Stack>

        <Divider />

        {/* === KASA === */}
        <Stack gap="sm" py="sm">
          <SectionLabel>Kasa</SectionLabel>
          <NumberInput
            label="Tolerancja kasowa (zł)"
            description="Różnica do tej kwoty traktowana jako OK przy zamknięciu"
            min={0}
            suffix=" zł"
            {...form.getInputProps("cashTolerance")}
          />
          <NumberInput
            label="Cel miesięczny (liczba usług)"
            description="Target wyświetlany na Dashboard"
            min={1}
            {...form.getInputProps("monthTarget")}
          />
        </Stack>

        <Divider />

        {/* === BONY === */}
        <Stack gap="sm" py="sm">
          <SectionLabel>Bony podarunkowe</SectionLabel>
          <Group grow>
            <NumberInput
              label="Ważność (miesiące)"
              min={1}
              {...form.getInputProps("voucherExpiryMonths")}
            />
            <NumberInput
              label="Min. kwota (zł)"
              min={1}
              suffix=" zł"
              {...form.getInputProps("voucherMinAmount")}
            />
          </Group>
          <TextInput
            label="Prefiks kodu"
            placeholder="BON-"
            maxLength={10}
            {...form.getInputProps("voucherCodePrefix")}
          />
        </Stack>

        <Divider />

        {/* === PROWIZJE === */}
        <Stack gap="sm" py="sm">
          <SectionLabel>Domyślne prowizje</SectionLabel>
          <Text fz="xs" c="dimmed">
            Stawki stosowane przy dodawaniu nowego pracownika
          </Text>
          <Group grow>
            <NumberInput
              label="Usługi (%)"
              min={0}
              max={100}
              suffix="%"
              {...form.getInputProps("defaultCommissionService")}
            />
            <NumberInput
              label="Produkty (%)"
              min={0}
              max={100}
              suffix="%"
              {...form.getInputProps("defaultCommissionProduct")}
            />
          </Group>
        </Stack>

        <Divider />

        {/* === PŁATNOŚCI === */}
        <Stack gap="sm" py="sm">
          <SectionLabel>Metody płatności</SectionLabel>
          <Text fz="xs" c="dimmed">
            Dostępne metody w POS
          </Text>
          {ALL_PAYMENT_METHODS.map((pm) => (
            <Checkbox
              key={pm.value}
              label={pm.label}
              checked={form.values.enabledPaymentMethods.includes(pm.value)}
              onChange={(e) => {
                const current = form.values.enabledPaymentMethods;
                if (e.currentTarget.checked) {
                  form.setFieldValue("enabledPaymentMethods", [...current, pm.value]);
                } else {
                  form.setFieldValue(
                    "enabledPaymentMethods",
                    current.filter((m) => m !== pm.value)
                  );
                }
              }}
            />
          ))}
          {form.errors.enabledPaymentMethods && (
            <Text fz="xs" c="red">
              {form.errors.enabledPaymentMethods}
            </Text>
          )}
        </Stack>

        <Divider />

        {/* === FUNKCJE === */}
        <Stack gap="sm" py="sm">
          <SectionLabel>Funkcje</SectionLabel>
          <Switch
            label="Katalog Wiedzy"
            description="Opisy usług i produktów widoczne dla pracowników"
            checked={form.values.knowledgeBaseEnabled}
            onChange={(e) => form.setFieldValue("knowledgeBaseEnabled", e.currentTarget.checked)}
          />
        </Stack>

        <Divider />

        {/* === WYDRUKI === */}
        <Stack gap="sm" py="sm">
          <SectionLabel>Wydruki</SectionLabel>
          <Textarea
            label="Stopka kwitu"
            placeholder="Dziękujemy za wizytę!"
            autosize
            minRows={2}
            maxRows={4}
            {...form.getInputProps("receiptFooter")}
          />
        </Stack>
      </Container>

      {/* === BOTTOM CTA === */}
      <Box
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          borderTop: "1px solid var(--mantine-color-default-border)",
          backgroundColor: "var(--mantine-color-body)",
        }}
        p="md"
      >
        <Container size="lg">
          <Button
            fullWidth
            size="lg"
            color="dark"
            onClick={handleSave}
            loading={saving}
            disabled={!form.isDirty()}
            fz="md"
            fw={600}
          >
            Zapisz ustawienia
          </Button>
        </Container>
      </Box>
    </Box>
  );
}
