import { useState, useEffect } from "react";
import { useForm } from "@mantine/form";
import { useSalonSettings } from "@/hooks/useDbData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
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
  Button,
  Skeleton,
  Modal,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { PageHeader } from "@/components/layout/PageHeader";
import { BOTTOM_NAV_HEIGHT } from "@/components/layout/BottomNavBar";
import { SectionLabel } from "@/components/layout/SectionLabel";

export default function AdminSettingsPage(): React.JSX.Element {
  useDocumentTitle("Ustawienia");
  const { data: salon, loading } = useSalonSettings();
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState(0);
  const [balanceClearedAt, setBalanceClearedAt] = useState<string | null>(null);
  const [resetModal, setResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  const form = useForm({
    initialValues: {
      name: "",
      cashTolerance: 10 as number | string,
      monthTarget: 600 as number | string,
      defaultCommissionService: 40 as number | string,
      defaultCommissionProduct: 20 as number | string,
      retentionThresholdTop: 95 as number | string,
      retentionThresholdHigh: 85 as number | string,
      retentionThresholdMid: 75 as number | string,
    },
    validate: {
      name: (v) => (v.trim() ? null : "Nazwa jest wymagana"),
      cashTolerance: (v) => (Number(v) >= 0 ? null : "Wartość >= 0"),
      monthTarget: (v) => (Number(v) > 0 ? null : "Wartość > 0"),
      defaultCommissionService: (v) => (Number(v) >= 0 && Number(v) <= 100 ? null : "0-100%"),
      defaultCommissionProduct: (v) => (Number(v) >= 0 && Number(v) <= 100 ? null : "0-100%"),
      retentionThresholdTop: (v) => (Number(v) > 0 && Number(v) <= 100 ? null : "1-100%"),
      retentionThresholdHigh: (v) => (Number(v) > 0 && Number(v) <= 100 ? null : "1-100%"),
      retentionThresholdMid: (v) => (Number(v) > 0 && Number(v) <= 100 ? null : "1-100%"),
    },
  });

  useEffect(() => {
    if (!salon) return;
    form.setValues({
      name: salon.name,
      cashTolerance: salon.cashTolerance,
      monthTarget: salon.monthTarget,
      defaultCommissionService: salon.defaultCommissionService,
      defaultCommissionProduct: salon.defaultCommissionProduct,
      retentionThresholdTop: salon.retentionThresholdTop,
      retentionThresholdHigh: salon.retentionThresholdHigh,
      retentionThresholdMid: salon.retentionThresholdMid,
    });
    form.resetDirty();
    setBalanceClearedAt(salon.balanceClearedAt);
    db.dailyReports
      .getBalanceSince(salon.balanceClearedAt)
      .then(setBalance)
      .catch((err) => console.error("[AdminSettings] balance load failed:", err));
  }, [salon]);

  const handleSave = async (): Promise<void> => {
    if (form.validate().hasErrors) return;
    setSaving(true);
    try {
      const v = form.values;
      await db.salon.update({
        name: v.name,
        cashTolerance: Number(v.cashTolerance),
        monthTarget: Number(v.monthTarget),
        defaultCommissionService: Number(v.defaultCommissionService),
        defaultCommissionProduct: Number(v.defaultCommissionProduct),
        retentionThresholdTop: Number(v.retentionThresholdTop),
        retentionThresholdHigh: Number(v.retentionThresholdHigh),
        retentionThresholdMid: Number(v.retentionThresholdMid),
      });
      form.resetDirty();
      notifications.show({
        message: "Ustawienia zapisane",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error("[AdminSettings] Save failed:", err);
      notifications.show({ message: "Nie udało się zapisać. Spróbuj ponownie.", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  const handleResetBalance = async (): Promise<void> => {
    setResetting(true);
    try {
      const updated = await db.salon.update({ balanceClearedAt: new Date().toISOString() });
      setBalanceClearedAt(updated.balanceClearedAt);
      setBalance(0);
      setResetModal(false);
      notifications.show({
        message: "Bilans wyzerowany",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error("[AdminSettings] reset balance failed:", err);
      notifications.show({ message: "Nie udało się wyzerować bilansu.", color: "red" });
    } finally {
      setResetting(false);
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
          <TextInput
            label="Nazwa salonu"
            placeholder="FORMEN"
            size="md"
            {...form.getInputProps("name")}
          />
        </Stack>

        <Divider />

        {/* === KASA === */}
        <Stack gap="sm" py="sm">
          <SectionLabel>Kasa</SectionLabel>
          <NumberInput
            label="Cel miesięczny (liczba usług)"
            description="Target wyświetlany na Dashboard"
            min={1}
            size="md"
            onFocus={(event) => event.currentTarget.select()}
            {...form.getInputProps("monthTarget")}
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
              size="md"
              onFocus={(event) => event.currentTarget.select()}
              {...form.getInputProps("defaultCommissionService")}
            />
            <NumberInput
              label="Produkty (%)"
              min={0}
              max={100}
              suffix="%"
              size="md"
              onFocus={(event) => event.currentTarget.select()}
              {...form.getInputProps("defaultCommissionProduct")}
            />
          </Group>
        </Stack>

        <Divider />

        {/* === PROGI RETENCJI === */}
        <Stack gap="sm" py="sm">
          <SectionLabel>Progi retencji</SectionLabel>
          <Text fz="xs" c="dimmed">
            Progi procentowe dla rang retencji pracowników
          </Text>
          <NumberInput
            label="👑 MISTRZ (od %)"
            min={1}
            max={100}
            suffix="%"
            size="md"
            onFocus={(event) => event.currentTarget.select()}
            {...form.getInputProps("retentionThresholdTop")}
          />
          <NumberInput
            label="💎 MISTRZ (od %)"
            min={1}
            max={100}
            suffix="%"
            size="md"
            onFocus={(event) => event.currentTarget.select()}
            {...form.getInputProps("retentionThresholdHigh")}
          />
          <NumberInput
            label="⭐ SOLIDNY (od %)"
            min={1}
            max={100}
            suffix="%"
            size="md"
            onFocus={(event) => event.currentTarget.select()}
            {...form.getInputProps("retentionThresholdMid")}
          />
          <Text fz="xs" c="dimmed">
            Poniżej progu SOLIDNY wyświetla się 📈 ROZWÓJ
          </Text>
        </Stack>

        <Divider />

        {/* === BILANS KASOWY === */}
        <Stack gap="sm" py="sm">
          <SectionLabel>Bilans kasowy</SectionLabel>
          <Text fz="xs" c="dimmed">
            Skumulowana suma nadwyżek i mank z zamknięć zmiany od ostatniego rozliczenia.
          </Text>
          <Box
            p="sm"
            style={{
              borderRadius: "var(--mantine-radius-md)",
              backgroundColor: "var(--mantine-color-default-hover)",
            }}
          >
            <Text fz="xs" c="dimmed">
              {balanceClearedAt
                ? `od: ${new Date(balanceClearedAt).toLocaleDateString("pl-PL")}`
                : "od początku"}
            </Text>
            <Text fz="xl" fw={700} c={balance < 0 ? "red" : "green"}>
              {balance > 0 ? "+" : ""}
              {balance.toLocaleString("pl-PL")} zł
            </Text>
          </Box>
          <Button variant="light" color="red" onClick={() => setResetModal(true)}>
            Rozlicz (wyzeruj bilans)
          </Button>
        </Stack>
      </Container>

      {/* === BOTTOM CTA === */}
      <Box
        style={{
          position: "fixed",
          bottom: BOTTOM_NAV_HEIGHT,
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

      <Modal
        opened={resetModal}
        onClose={() => setResetModal(false)}
        title={
          <Text fw={700} fz="lg">
            Wyzerować bilans?
          </Text>
        }
        size="sm"
      >
        <Stack gap="md">
          <Text fz="sm">
            Bilans zostanie wyzerowany od teraz. Tej operacji nie można cofnąć. Bieżąca wartość:{" "}
            <Text span fw={700} c={balance < 0 ? "red" : "green"}>
              {balance > 0 ? "+" : ""}
              {balance.toLocaleString("pl-PL")} zł
            </Text>
            .
          </Text>
          <Group grow>
            <Button variant="default" onClick={() => setResetModal(false)}>
              Anuluj
            </Button>
            <Button color="red" loading={resetting} onClick={handleResetBalance}>
              Wyzeruj
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
