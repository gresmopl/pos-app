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
  Button,
  Skeleton,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { PageHeader } from "@/components/layout/PageHeader";
import { BOTTOM_NAV_HEIGHT } from "@/components/layout/BottomNavBar";

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
              {...form.getInputProps("defaultCommissionService")}
            />
            <NumberInput
              label="Produkty (%)"
              min={0}
              max={100}
              suffix="%"
              size="md"
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
            {...form.getInputProps("retentionThresholdTop")}
          />
          <NumberInput
            label="💎 MISTRZ (od %)"
            min={1}
            max={100}
            suffix="%"
            size="md"
            {...form.getInputProps("retentionThresholdHigh")}
          />
          <NumberInput
            label="⭐ SOLIDNY (od %)"
            min={1}
            max={100}
            suffix="%"
            size="md"
            {...form.getInputProps("retentionThresholdMid")}
          />
          <Text fz="xs" c="dimmed">
            Poniżej progu SOLIDNY wyświetla się 📈 ROZWÓJ
          </Text>
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
    </Box>
  );
}
