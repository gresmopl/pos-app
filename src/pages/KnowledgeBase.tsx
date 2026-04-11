import { useState } from "react";
import { useServices, useProducts } from "@/hooks/useDbData";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import type { Service, Product } from "@/lib/types";
import {
  Text,
  Group,
  Stack,
  Box,
  Container,
  Divider,
  TextInput,
  Accordion,
  Badge,
  Skeleton,
} from "@mantine/core";
import { IconSearch, IconClock } from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/PageHeader";

function ServiceItem({ service }: { service: Service }): React.JSX.Element {
  return (
    <Accordion.Item value={service.id}>
      <Accordion.Control>
        <Group justify="space-between" wrap="nowrap" pr="xs">
          <div style={{ minWidth: 0 }}>
            <Text fw={600} fz="md">
              {service.name}
            </Text>
            {service.description && (
              <Text fz="xs" c="dimmed">
                {service.description}
              </Text>
            )}
          </div>
          <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
            {service.durationMinutes && (
              <Badge size="sm" variant="light" color="gray" leftSection={<IconClock size={10} />}>
                {service.durationMinutes} min
              </Badge>
            )}
            <Text fw={600} fz="sm" style={{ whiteSpace: "nowrap" }}>
              {service.price} zł
            </Text>
          </Group>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        {service.descriptionLong ? (
          <Text fz="sm" style={{ whiteSpace: "pre-line" }}>
            {service.descriptionLong}
          </Text>
        ) : (
          <Text fz="sm" c="dimmed" fs="italic">
            Brak opisu szczegółowego
          </Text>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function ProductItem({ product }: { product: Product }): React.JSX.Element {
  return (
    <Group justify="space-between" py="sm" px="xs" wrap="nowrap">
      <div style={{ minWidth: 0 }}>
        <Text fw={500} fz="md">
          {product.name}
        </Text>
        {product.description && (
          <Text fz="xs" c="dimmed">
            {product.description}
          </Text>
        )}
      </div>
      <Text fw={600} fz="sm" style={{ whiteSpace: "nowrap" }}>
        {product.price} zł
      </Text>
    </Group>
  );
}

export default function KnowledgeBasePage(): React.JSX.Element {
  const { data: services = [], loading: svcLoading } = useServices();
  const { data: products = [], loading: prodLoading } = useProducts();
  const [search, setSearch] = useState("");

  const query = search.toLowerCase().trim();

  const filteredServices = query
    ? services.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.category.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query) ||
          s.descriptionLong?.toLowerCase().includes(query)
      )
    : services;

  const filteredProducts = query
    ? products.filter(
        (p) => p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query)
      )
    : products;

  const groupedServices: { category: string; items: Service[] }[] = SERVICE_CATEGORIES.map(
    (cat) => ({
      category: cat,
      items: filteredServices.filter((s) => s.category === cat),
    })
  ).filter((g) => g.items.length > 0);

  // Services without a known category
  const uncategorized = filteredServices.filter(
    (s) => !(SERVICE_CATEGORIES as readonly string[]).includes(s.category)
  );
  if (uncategorized.length > 0) {
    groupedServices.push({ category: "Inne", items: uncategorized });
  }

  const loading = svcLoading || prodLoading;

  return (
    <Box mih="100vh" pb={40}>
      <Container size="lg">
        <PageHeader title="Katalog Wiedzy" backTo="/" />

        <Divider />

        <Box py="sm">
          <TextInput
            placeholder="Szukaj usługi lub produktu..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
        </Box>

        {loading && (
          <Stack gap="md" py="md">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={50} />
            ))}
          </Stack>
        )}

        {!loading && (
          <>
            {/* === USŁUGI === */}
            {groupedServices.length > 0 && (
              <Stack gap={0}>
                {groupedServices.map((group) => (
                  <div key={group.category}>
                    <Box py="xs" px="xs">
                      <Group gap="xs">
                        <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
                          {group.category}
                        </Text>
                        <Badge size="xs" variant="light" color="gray">
                          {group.items.length}
                        </Badge>
                      </Group>
                    </Box>
                    <Accordion variant="separated" chevronPosition="left">
                      {group.items.map((svc) => (
                        <ServiceItem key={svc.id} service={svc} />
                      ))}
                    </Accordion>
                  </div>
                ))}
              </Stack>
            )}

            {/* === PRODUKTY === */}
            {filteredProducts.length > 0 && (
              <>
                <Divider mt="md" />
                <Box py="xs" px="xs">
                  <Group gap="xs">
                    <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
                      Produkty
                    </Text>
                    <Badge size="xs" variant="light" color="gray">
                      {filteredProducts.length}
                    </Badge>
                  </Group>
                </Box>
                <Stack gap={0}>
                  {filteredProducts.map((prod, i) => (
                    <div key={prod.id}>
                      <ProductItem product={prod} />
                      {i < filteredProducts.length - 1 && <Divider />}
                    </div>
                  ))}
                </Stack>
              </>
            )}

            {/* === PUSTY STAN === */}
            {groupedServices.length === 0 && filteredProducts.length === 0 && (
              <Stack align="center" gap="sm" py="xl">
                <Text fz="sm" c="dimmed" ta="center">
                  {query ? `Brak wyników dla "${search}"` : "Brak usług i produktów w bazie"}
                </Text>
              </Stack>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
