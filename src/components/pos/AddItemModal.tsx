import { useState, useId } from "react";
import {
  Text,
  Group,
  Stack,
  UnstyledButton,
  Divider,
  Modal,
  SegmentedControl,
  TextInput,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import type { Service } from "@/data/services";
import type { Product } from "@/data/products";

interface AddItemModalProps {
  opened: boolean;
  onClose: () => void;
  services: Service[];
  products: Product[];
  onAdd: (item: { id: string; name: string; price: number }, type: "service" | "product") => void;
}

export function AddItemModal({ opened, onClose, services, products, onAdd }: AddItemModalProps) {
  const tabId = useId();
  const [tab, setTab] = useState("services");
  const [search, setSearch] = useState("");

  const handleClose = () => {
    onClose();
    setSearch("");
  };

  const handleAdd = (
    item: { id: string; name: string; price: number },
    type: "service" | "product"
  ) => {
    onAdd(item, type);
    setSearch("");
  };

  const query = search.toLowerCase();
  const filteredServices = services.filter(
    (s) => s.isActive && s.name.toLowerCase().includes(query)
  );
  const filteredProducts = products.filter(
    (p) => p.isActive && p.name.toLowerCase().includes(query)
  );

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={700} fz="lg">
          Dodaj
        </Text>
      }
      size="lg"
    >
      <SegmentedControl
        id={tabId}
        fullWidth
        value={tab}
        onChange={setTab}
        data={[
          { label: "Usługi", value: "services" },
          { label: "Produkty", value: "products" },
        ]}
        mb="md"
      />
      <TextInput
        placeholder="Szukaj..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        mb="md"
      />
      <Stack gap={0}>
        {tab === "services" &&
          filteredServices.map((service) => (
            <div key={service.id}>
              <UnstyledButton w="100%" py="sm" onClick={() => handleAdd(service, "service")}>
                <Group justify="space-between">
                  <div>
                    <Text fw={500} fz="md">
                      {service.name}
                    </Text>
                    <Text fz="xs" c="dimmed">
                      {service.category}
                    </Text>
                  </div>
                  <Text fw={600} fz="md">
                    {service.price.toLocaleString("pl-PL")} zł
                  </Text>
                </Group>
              </UnstyledButton>
              <Divider />
            </div>
          ))}
        {tab === "products" &&
          filteredProducts.map((product) => (
            <div key={product.id}>
              <UnstyledButton w="100%" py="sm" onClick={() => handleAdd(product, "product")}>
                <Group justify="space-between">
                  <Text fw={500} fz="md">
                    {product.name}
                  </Text>
                  <Text fw={600} fz="md">
                    {product.price.toLocaleString("pl-PL")} zł
                  </Text>
                </Group>
              </UnstyledButton>
              <Divider />
            </div>
          ))}
      </Stack>
    </Modal>
  );
}
