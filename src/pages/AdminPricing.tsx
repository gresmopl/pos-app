import { useState, useId } from "react";
import { useForm } from "@mantine/form";
import { mockServices } from "@/data/services";
import { mockProducts } from "@/data/products";
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
  Button,
} from "@mantine/core";
import { IconPlus, IconPencil } from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/PageHeader";

type PricingItem = {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  category?: string;
};

export default function PricingPage() {
  const pricingTabId = useId();
  const [tab, setTab] = useState("services");
  const [services, setServices] = useState<Service[]>([...mockServices]);
  const [products, setProducts] = useState<Product[]>([...mockProducts]);

  const [editModal, setEditModal] = useState(false);
  const [editItem, setEditItem] = useState<PricingItem | null>(null);

  const editForm = useForm({
    initialValues: {
      name: "",
      price: 0 as number | string,
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
    editForm.setValues({ name: item.name, price: item.price });
    editForm.clearErrors();
    setEditModal(true);
  };

  const saveItem = () => {
    if (editForm.validate().hasErrors) return;
    const { name: editName, price: editPrice } = editForm.values;
    const price = Number(editPrice);

    if (tab === "services") {
      if (editItem) {
        setServices((prev) =>
          prev.map((s) => (s.id === editItem.id ? { ...s, name: editName, price } : s))
        );
      } else {
        const newItem: Service = {
          id: crypto.randomUUID(),
          name: editName,
          price,
          category: "Inne",
          isActive: true,
        };
        setServices((prev) => [...prev, newItem]);
      }
    } else {
      if (editItem) {
        setProducts((prev) =>
          prev.map((p) => (p.id === editItem.id ? { ...p, name: editName, price } : p))
        );
      } else {
        const newItem: Product = {
          id: crypto.randomUUID(),
          name: editName,
          price,
          isActive: true,
        };
        setProducts((prev) => [...prev, newItem]);
      }
    }
    setEditModal(false);
  };

  const toggleActive = (id: string) => {
    if (tab === "services") {
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)));
    } else {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)));
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
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditModal(false)}>
              Anuluj
            </Button>
            <Button onClick={saveItem}>Zapisz</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
