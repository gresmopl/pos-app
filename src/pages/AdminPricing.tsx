import { useState, useId, useEffect } from "react";
import { useForm } from "@mantine/form";
import { useAllServices, useAllProducts } from "@/hooks/useDbData";
import { db } from "@/db";
import type { Service, Product } from "@/lib/types";
import {
  Text,
  Group,
  Stack,
  Box,
  Container,
  ActionIcon,
  Divider,
  SegmentedControl,
  Switch,
  Modal,
  TextInput,
  NumberInput,
  Textarea,
  Button,
} from "@mantine/core";
import { IconPlus, IconPencil, IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { PageHeader } from "@/components/layout/PageHeader";

type PricingItem = {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  category?: string;
  description?: string;
  descriptionLong?: string;
};

export default function PricingPage() {
  const pricingTabId = useId();
  const { data: dbServices } = useAllServices();
  const { data: dbProducts } = useAllProducts();
  const [tab, setTab] = useState("services");
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (dbServices) setServices([...dbServices]);
  }, [dbServices]);
  useEffect(() => {
    if (dbProducts) setProducts([...dbProducts]);
  }, [dbProducts]);

  const [editModal, setEditModal] = useState(false);
  const [editItem, setEditItem] = useState<PricingItem | null>(null);

  const editForm = useForm({
    initialValues: {
      name: "",
      price: 0 as number | string,
      durationMinutes: "",
      description: "",
      descriptionLong: "",
    },
    validate: {
      name: (v) => (v.trim() ? null : "Nazwa jest wymagana"),
      price: (v) => (Number(v) > 0 ? null : "Cena musi być większa od 0"),
    },
  });

  const items: PricingItem[] =
    tab === "services" ? services.map((s) => ({ ...s })) : products.map((p) => ({ ...p }));

  const activeItems = items.filter((i) => i.isActive);
  const inactiveItems = items.filter((i) => !i.isActive);

  const openAdd = () => {
    setEditItem(null);
    editForm.reset();
    setEditModal(true);
  };

  const openEdit = (item: PricingItem) => {
    setEditItem(item);
    const svc = tab === "services" ? services.find((s) => s.id === item.id) : null;
    editForm.setValues({
      name: item.name,
      price: item.price,
      durationMinutes: svc?.durationMinutes ?? "",
      description: item.description || "",
      descriptionLong: item.descriptionLong || "",
    });
    editForm.clearErrors();
    setEditModal(true);
  };

  const [saving, setSaving] = useState(false);

  const saveItem = async () => {
    if (editForm.validate().hasErrors) return;
    const {
      name: editName,
      price: editPrice,
      durationMinutes,
      description,
      descriptionLong,
    } = editForm.values;
    const price = Number(editPrice);
    const duration = durationMinutes?.toString().trim() || undefined;

    setSaving(true);
    try {
      if (tab === "services") {
        const input = {
          name: editName,
          price,
          durationMinutes: duration,
          category: editItem?.category || "Inne",
          description: description || undefined,
          descriptionLong: descriptionLong || undefined,
        };
        if (editItem) {
          const updated = await db.services.update(editItem.id, input);
          setServices((prev) => prev.map((s) => (s.id === editItem.id ? updated : s)));
        } else {
          const created = await db.services.create(input);
          setServices((prev) => [...prev, created]);
        }
      } else {
        const input = {
          name: editName,
          price,
          description: description || undefined,
        };
        if (editItem) {
          const updated = await db.products.update(editItem.id, input);
          setProducts((prev) => prev.map((p) => (p.id === editItem.id ? updated : p)));
        } else {
          const created = await db.products.create(input);
          setProducts((prev) => [...prev, created]);
        }
      }
      setEditModal(false);
      notifications.show({
        message: editItem ? "Zapisano zmiany" : "Dodano nową pozycję",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      console.error("[AdminPricing] Save failed:", err);
      notifications.show({ message: "Błąd zapisu", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  const doToggle = async (id: string, newActive: boolean) => {
    try {
      if (tab === "services") {
        await db.services.toggleActive(id, newActive);
        setServices((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: newActive } : s)));
      } else {
        await db.products.toggleActive(id, newActive);
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: newActive } : p)));
      }
    } catch (err) {
      console.error("[AdminPricing] Toggle failed:", err);
      notifications.show({ message: "Błąd zmiany statusu", color: "red" });
    }
  };

  const toggleActive = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (item.isActive) {
      const label = tab === "services" ? "usługę" : "produkt";
      modals.openConfirmModal({
        title: `Dezaktywacja`,
        children: (
          <Text fz="sm">
            Czy na pewno dezaktywować {label} <b>{item.name}</b>? Nie będzie widoczny w POS.
          </Text>
        ),
        labels: { confirm: "Dezaktywuj", cancel: "Anuluj" },
        confirmProps: { color: "red" },
        onConfirm: () => doToggle(id, false),
      });
    } else {
      doToggle(id, true);
    }
  };

  return (
    <Box mih="100vh" pb={80}>
      <Container size="lg">
        <PageHeader
          title="Cennik"
          backTo="/admin"
          rightSection={
            <ActionIcon
              variant="light"
              color="green"
              size="lg"
              onClick={openAdd}
              aria-label="Dodaj pozycję"
            >
              <IconPlus size={20} />
            </ActionIcon>
          }
        />

        <Divider />

        {/* ===== TABS ===== */}
        <Box py="md">
          <SegmentedControl
            id={pricingTabId}
            fullWidth
            value={tab}
            onChange={setTab}
            data={[
              { label: "Usługi", value: "services" },
              { label: "Produkty", value: "products" },
            ]}
          />
        </Box>

        <Divider />

        {/* ===== ACTIVE ITEMS ===== */}
        <Stack gap={0} py="sm">
          {activeItems.map((item, index) => (
            <div key={item.id}>
              <Group justify="space-between" py="sm" px="xs" wrap="nowrap">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={500} fz="md">
                    {item.name}
                  </Text>
                </div>
                <Group gap="sm" wrap="nowrap">
                  <Text fw={600} fz="md" style={{ whiteSpace: "nowrap" }}>
                    {item.price.toLocaleString("pl-PL")} zł
                  </Text>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={() => openEdit(item)}
                  >
                    <IconPencil size={16} />
                  </ActionIcon>
                  <Switch
                    checked={item.isActive}
                    onChange={() => toggleActive(item.id)}
                    size="sm"
                  />
                </Group>
              </Group>
              {index < activeItems.length - 1 && <Divider />}
            </div>
          ))}
        </Stack>

        {/* ===== INACTIVE ITEMS ===== */}
        {inactiveItems.length > 0 && (
          <>
            <Divider />
            <Box py="sm">
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1} mb="sm" px="xs">
                Nieaktywne
              </Text>
              <Stack gap={0}>
                {inactiveItems.map((item, index) => (
                  <div key={item.id}>
                    <Group justify="space-between" py="sm" px="xs" wrap="nowrap" opacity={0.5}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={500} fz="md">
                          {item.name}
                        </Text>
                      </div>
                      <Group gap="sm" wrap="nowrap">
                        <Text fw={600} fz="md" style={{ whiteSpace: "nowrap" }}>
                          {item.price.toLocaleString("pl-PL")} zł
                        </Text>
                        <Switch
                          checked={item.isActive}
                          onChange={() => toggleActive(item.id)}
                          size="sm"
                        />
                      </Group>
                    </Group>
                    {index < inactiveItems.length - 1 && <Divider />}
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
            {editItem ? "Edytuj" : "Nowa pozycja"}
          </Text>
        }
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label="Nazwa"
            placeholder="np. Strzyżenie Męskie"
            {...editForm.getInputProps("name")}
          />
          <NumberInput
            label="Cena (zł)"
            placeholder="0"
            min={0}
            suffix=" zł"
            {...editForm.getInputProps("price")}
          />
          {tab === "services" && (
            <TextInput
              label="Czas trwania (min)"
              placeholder="np. 45 lub 30-45"
              {...editForm.getInputProps("durationMinutes")}
            />
          )}
          <Textarea
            label="Krótki opis"
            placeholder="np. Strzyżenie + mycie + stylizacja, 30-45 min"
            autosize
            minRows={2}
            maxRows={3}
            {...editForm.getInputProps("description")}
          />
          {tab === "services" && (
            <Textarea
              label="Opis szczegółowy"
              placeholder="Pełny opis usługi dla pracowników (widoczny w Katalogu Wiedzy)"
              autosize
              minRows={3}
              maxRows={6}
              {...editForm.getInputProps("descriptionLong")}
            />
          )}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditModal(false)}>
              Anuluj
            </Button>
            <Button onClick={saveItem} loading={saving}>
              Zapisz
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
