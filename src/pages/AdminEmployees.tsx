import { useState, useEffect } from "react";
import { useForm } from "@mantine/form";
import { useAllEmployees } from "@/hooks/useDbData";
import { db } from "@/db";
import type { Employee } from "@/lib/types";
import {
  Text,
  Group,
  Stack,
  Box,
  Container,
  ActionIcon,
  Divider,
  Switch,
  Modal,
  TextInput,
  NumberInput,
  SegmentedControl,
  Button,
  Avatar,
  Badge,
} from "@mantine/core";
import { IconPlus, IconPencil, IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { PageHeader } from "@/components/layout/PageHeader";

export default function AdminEmployeesPage() {
  const { data: dbEmployees } = useAllEmployees();
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (dbEmployees) setEmployees([...dbEmployees]);
  }, [dbEmployees]);

  const [editModal, setEditModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);

  const editForm = useForm({
    initialValues: {
      name: "",
      avatar: "",
      role: "barber" as "admin" | "barber",
      commissionService: 0 as number | string,
      commissionProduct: 0 as number | string,
      retentionPercent: 0 as number | string,
    },
    validate: {
      name: (v) => (v.trim() ? null : "Imię jest wymagane"),
      commissionService: (v) => (Number(v) >= 0 && Number(v) <= 100 ? null : "0-100%"),
      commissionProduct: (v) => (Number(v) >= 0 && Number(v) <= 100 ? null : "0-100%"),
      retentionPercent: (v) =>
        v === "" || v === undefined ? null : Number(v) >= 0 && Number(v) <= 100 ? null : "0-100%",
    },
  });

  const activeEmployees = employees.filter((e) => e.isActive);
  const inactiveEmployees = employees.filter((e) => !e.isActive);

  const openAdd = () => {
    setEditEmployee(null);
    editForm.reset();
    setEditModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditEmployee(emp);
    editForm.setValues({
      name: emp.name,
      avatar: emp.avatar.length <= 3 ? emp.avatar : "",
      role: emp.role,
      commissionService: emp.commissionServicePercent,
      commissionProduct: emp.commissionProductPercent,
      retentionPercent: emp.retentionPercent ?? 0,
    });
    editForm.clearErrors();
    setEditModal(true);
  };

  const [saving, setSaving] = useState(false);

  const saveEmployee = async () => {
    if (editForm.validate().hasErrors) return;
    const { name, avatar, role, commissionService, commissionProduct, retentionPercent } =
      editForm.values;
    const input = {
      name,
      avatarUrl: avatar.trim() || undefined,
      role,
      commissionServicePercent: Number(commissionService),
      commissionProductPercent: Number(commissionProduct),
      retentionPercent:
        retentionPercent === "" || retentionPercent === undefined ? null : Number(retentionPercent),
    };

    setSaving(true);
    try {
      if (editEmployee) {
        const updated = await db.employees.update(editEmployee.id, input);
        setEmployees((prev) => prev.map((e) => (e.id === editEmployee.id ? updated : e)));
      } else {
        const created = await db.employees.create(input);
        setEmployees((prev) => [...prev, created]);
      }
      setEditModal(false);
      notifications.show({
        message: editEmployee ? "Zapisano zmiany" : "Dodano pracownika",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error("[AdminEmployees] Save failed:", err);
      notifications.show({ message: "Nie udało się zapisać. Spróbuj ponownie.", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  const doToggle = async (id: string, newActive: boolean) => {
    try {
      await db.employees.toggleActive(id, newActive);
      setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, isActive: newActive } : e)));
    } catch (err) {
      console.error("[AdminEmployees] Toggle failed:", err);
      notifications.show({
        message: "Nie udało się zmienić statusu. Spróbuj ponownie.",
        color: "red",
      });
    }
  };

  const toggleActive = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    if (emp.isActive) {
      modals.openConfirmModal({
        title: "Dezaktywacja pracownika",
        children: (
          <Text fz="sm">Czy na pewno dezaktywować {emp.name}? Nie będzie widoczny w POS.</Text>
        ),
        labels: { confirm: "Dezaktywuj", cancel: "Anuluj" },
        confirmProps: { color: "red" },
        onConfirm: () => doToggle(id, false),
      });
    } else {
      doToggle(id, true);
    }
  };

  const renderEmployee = (emp: Employee, inactive?: boolean) => (
    <Group justify="space-between" py="sm" px="xs" wrap="nowrap" opacity={inactive ? 0.5 : 1}>
      <Group gap="md" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
        <Avatar
          size={40}
          radius="xl"
          color={emp.role === "admin" ? "blue" : "green"}
          variant="light"
        >
          {emp.avatar}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <Group gap={6}>
            <Text fw={500} fz="md">
              {emp.name}
            </Text>
            {emp.role === "admin" && (
              <Badge size="xs" variant="light" color="blue">
                admin
              </Badge>
            )}
          </Group>
          <Text fz="xs" c="dimmed">
            Usługi {emp.commissionServicePercent}% / Produkty {emp.commissionProductPercent}%
          </Text>
        </div>
      </Group>
      <Group gap="sm" wrap="nowrap">
        {!inactive && (
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => openEdit(emp)}>
            <IconPencil size={20} />
          </ActionIcon>
        )}
        <Switch checked={emp.isActive} onChange={() => toggleActive(emp.id)} size="md" />
      </Group>
    </Group>
  );

  return (
    <Box mih="100vh" pb={80}>
      <Container size="lg">
        <PageHeader
          title="Pracownicy"
          backTo="/admin"
          rightSection={
            <ActionIcon
              variant="light"
              color="green"
              size="lg"
              onClick={openAdd}
              aria-label="Dodaj pracownika"
            >
              <IconPlus size={20} />
            </ActionIcon>
          }
        />

        <Divider />

        {/* ===== ACTIVE ===== */}
        <Stack gap={0} py="sm">
          {activeEmployees.map((emp, index) => (
            <div key={emp.id}>
              {renderEmployee(emp)}
              {index < activeEmployees.length - 1 && <Divider />}
            </div>
          ))}
        </Stack>

        {/* ===== INACTIVE ===== */}
        {inactiveEmployees.length > 0 && (
          <>
            <Divider />
            <Box py="sm">
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1} mb="sm" px="xs">
                Nieaktywni
              </Text>
              <Stack gap={0}>
                {inactiveEmployees.map((emp, index) => (
                  <div key={emp.id}>
                    {renderEmployee(emp, true)}
                    {index < inactiveEmployees.length - 1 && <Divider />}
                  </div>
                ))}
              </Stack>
            </Box>
          </>
        )}
      </Container>

      {/* ===== EDIT/ADD MODAL ===== */}
      <Modal
        opened={editModal}
        onClose={() => setEditModal(false)}
        title={
          <Text fw={700} fz="lg">
            {editEmployee ? "Edytuj pracownika" : "Nowy pracownik"}
          </Text>
        }
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label="Imię / pseudonim"
            placeholder="np. Oliwia"
            size="md"
            data-autofocus
            {...editForm.getInputProps("name")}
          />
          <TextInput
            label="Symbol (2-3 litery)"
            placeholder="np. OL"
            maxLength={3}
            size="md"
            {...editForm.getInputProps("avatar")}
            description="Wyświetlany gdy brak zdjęcia"
          />
          <Box>
            <Text fz="sm" fw={500} mb={4}>
              Rola
            </Text>
            <SegmentedControl
              fullWidth
              value={editForm.values.role}
              onChange={(v) => editForm.setFieldValue("role", v as "admin" | "barber")}
              data={[
                { label: "Fryzjer", value: "barber" },
                { label: "Admin", value: "admin" },
              ]}
            />
          </Box>
          <NumberInput
            label="Prowizja od usług (%)"
            placeholder="0"
            min={0}
            max={100}
            suffix="%"
            size="md"
            {...editForm.getInputProps("commissionService")}
          />
          <NumberInput
            label="Prowizja od produktów (%)"
            placeholder="0"
            min={0}
            max={100}
            suffix="%"
            size="md"
            {...editForm.getInputProps("commissionProduct")}
          />
          <NumberInput
            label="Retencja (%)"
            description="Procent klientów wracających do pracownika"
            placeholder="Brak danych"
            min={0}
            max={100}
            suffix="%"
            size="md"
            {...editForm.getInputProps("retentionPercent")}
          />
          <Group justify="flex-end">
            <Button variant="subtle" size="lg" onClick={() => setEditModal(false)}>
              Anuluj
            </Button>
            <Button size="lg" onClick={saveEmployee} loading={saving}>
              Zapisz
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
