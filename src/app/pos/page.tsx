"use client";

import { Suspense, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { mockEmployees } from "@/data/employees";
import { mockServices } from "@/data/services";
import { mockProducts } from "@/data/products";
import {
  Text,
  Group,
  Stack,
  Box,
  Avatar,
  UnstyledButton,
  Divider,
  Container,
  ActionIcon,
  Badge,
  TextInput,
  SegmentedControl,
  Modal,
  Button,
  NumberInput,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconDiscount2,
  IconUser,
  IconSearch,
  IconCash,
  IconCreditCard,
  IconDeviceMobile,
  IconGift,
  IconArrowsSplit,
} from "@tabler/icons-react";

interface CartItem {
  cartId: string;
  id: string;
  name: string;
  price: number;
  type: "service" | "product";
}

interface DiscountState {
  type: "percent" | "amount";
  value: number;
}

export default function POSPageWrapper() {
  return (
    <Suspense>
      <POSPage />
    </Suspense>
  );
}

function POSPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const employeeId = searchParams.get("employee");
  const employee = mockEmployees.find((e) => e.id === employeeId);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [discount, setDiscount] = useState<DiscountState | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [voucherStep, setVoucherStep] = useState(false);
  const [voucherAmount, setVoucherAmount] = useState<number | string>("");
  const [customTipModal, setCustomTipModal] = useState(false);
  const [customTipValue, setCustomTipValue] = useState<number | string>("");
  const [splitModal, setSplitModal] = useState(false);
  const [splitCashAmount, setSplitCashAmount] = useState<number | string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [addTab, setAddTab] = useState("services");

  // Discount modal temp state
  const [tempDiscountType, setTempDiscountType] = useState<"percent" | "amount">("percent");
  const [tempDiscountValue, setTempDiscountValue] = useState<number | string>(0);

  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);

  const discountAmount = useMemo(() => {
    if (!discount) return 0;
    if (discount.type === "percent") {
      return Math.round(subtotal * (discount.value / 100) * 100) / 100;
    }
    return Math.min(discount.value, subtotal);
  }, [discount, subtotal]);

  const total = subtotal - discountAmount + tipAmount;

  const addToCart = (
    item: { id: string; name: string; price: number },
    type: "service" | "product"
  ) => {
    setCart((prev) => [...prev, { ...item, type, cartId: crypto.randomUUID() }]);
    setAddModalOpen(false);
    setSearchQuery("");
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const applyDiscount = () => {
    const val = Number(tempDiscountValue);
    if (val > 0) {
      setDiscount({ type: tempDiscountType, value: val });
    } else {
      setDiscount(null);
    }
    setDiscountModalOpen(false);
  };

  const clearDiscount = () => {
    setDiscount(null);
    setDiscountModalOpen(false);
  };

  const finalize = () => {
    setPaymentModalOpen(false);
    setCart([]);
    setTipAmount(0);
    setDiscount(null);
    router.push("/");
  };

  const filteredServices = mockServices.filter(
    (s) => s.isActive && s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredProducts = mockProducts.filter(
    (p) => p.isActive && p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!employee) {
    return (
      <Container size="lg" py="xl">
        <Text>Nie znaleziono pracownika.</Text>
        <Button variant="subtle" mt="md" onClick={() => router.push("/")}>
          Powrót do Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Box mih="100vh" pb={100}>
      <Container size="lg">
        {/* ===== HEADER ===== */}
        <Group justify="space-between" py="md">
          <Group gap="sm">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={() => router.push("/")}
              aria-label="Powrót"
            >
              <IconArrowLeft size={22} />
            </ActionIcon>
            <Text fw={700} fz={24}>
              Sprzedaż
            </Text>
          </Group>
          <Group gap="sm">
            <Avatar size={32} radius="xl" color="green" variant="light">
              {employee.avatar}
            </Avatar>
            <Text fw={500} fz="md">
              {employee.name}
            </Text>
          </Group>
        </Group>

        <Divider />

        {/* ===== CLIENT (optional) ===== */}
        <UnstyledButton w="100%" py="md">
          <Group gap="sm" c="dimmed">
            <IconUser size={20} />
            <Text fz="sm">Wybierz klienta albo pozostaw puste</Text>
          </Group>
        </UnstyledButton>

        <Divider />

        {/* ===== TOTAL ===== */}
        <Box py="md">
          <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
            Do zapłaty
          </Text>
          <Text fw={700} fz={40}>
            {total.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł
          </Text>
          {discount && (
            <Badge
              size="sm"
              variant="light"
              color="red"
              style={{ cursor: "pointer" }}
              onClick={() => setDiscountModalOpen(true)}
            >
              Rabat: -{discountAmount.toLocaleString("pl-PL")} zł
              {discount.type === "percent" && ` (${discount.value}%)`}
            </Badge>
          )}
        </Box>

        <Divider />

        {/* ===== CART ITEMS ===== */}
        <Box py="md">
          {cart.length === 0 ? (
            <Text fz="sm" ta="center" py="xl">
              Koszyk jest pusty. Dodaj usługę lub produkt.
            </Text>
          ) : (
            <Stack gap={0}>
              {cart.map((item, index) => (
                <div key={item.cartId}>
                  <Group justify="space-between" py="sm">
                    <div>
                      <Text fw={500} fz="md">
                        {item.name}
                      </Text>
                      <Text fz="xs" c="dimmed">
                        {item.type === "service" ? "Usługa" : "Produkt"}
                      </Text>
                    </div>
                    <Group gap="sm">
                      <Text fw={600} fz="md">
                        {item.price.toLocaleString("pl-PL")} zł
                      </Text>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={() => removeFromCart(item.cartId)}
                        aria-label="Usuń"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                  {index < cart.length - 1 && <Divider />}
                </div>
              ))}
            </Stack>
          )}
        </Box>

        {/* ===== TIP ===== */}
        {cart.length > 0 && (
          <>
            <Divider />
            <Box py="md">
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1} mb="xs">
                Napiwek
              </Text>
              <Group gap="sm">
                {[0, 5, 10, 20].map((val) => {
                  const tipVal = val === 0 ? 0 : Math.round(subtotal * (val / 100));
                  return (
                    <UnstyledButton
                      key={val}
                      onClick={() => setTipAmount(tipVal)}
                      px="md"
                      py="xs"
                      style={{
                        border: "1px solid var(--mantine-color-default-border)",
                        borderRadius: "var(--mantine-radius-md)",
                        backgroundColor:
                          tipAmount === tipVal ? "var(--mantine-color-green-light)" : undefined,
                      }}
                    >
                      <Text fz="sm" fw={500} ta="center">
                        {val === 0 ? "Bez" : `${val}%`}
                      </Text>
                      <Text fz="xs" c="dimmed" ta="center">
                        {tipVal} zł
                      </Text>
                    </UnstyledButton>
                  );
                })}
                <UnstyledButton
                  px="md"
                  py="xs"
                  style={{
                    border: "1px solid var(--mantine-color-default-border)",
                    borderRadius: "var(--mantine-radius-md)",
                  }}
                  onClick={() => {
                    setCustomTipValue(tipAmount || "");
                    setCustomTipModal(true);
                  }}
                >
                  <Text fz="sm" fw={500} ta="center">
                    Własny
                  </Text>
                  <Text fz="xs" c="dimmed" ta="center">
                    {tipAmount > 0 &&
                    ![0, 5, 10, 20].some((p) => Math.round(subtotal * (p / 100)) === tipAmount)
                      ? `${tipAmount} zł`
                      : "..."}
                  </Text>
                </UnstyledButton>
              </Group>
            </Box>
          </>
        )}

        {/* ===== ACTION BUTTONS ===== */}
        <Divider />
        <Group py="md" gap="md">
          <UnstyledButton onClick={() => setAddModalOpen(true)}>
            <Group gap={6}>
              <IconPlus size={18} />
              <Text fz="md" fw={500}>
                Dodaj
              </Text>
            </Group>
          </UnstyledButton>
          <UnstyledButton
            onClick={() => {
              setTempDiscountType(discount?.type || "percent");
              setTempDiscountValue(discount?.value || 0);
              setDiscountModalOpen(true);
            }}
          >
            <Group gap={6}>
              <IconDiscount2 size={18} />
              <Text fz="md" fw={500}>
                Rabat
              </Text>
            </Group>
          </UnstyledButton>
        </Group>
      </Container>

      {/* ===== BOTTOM CTA ===== */}
      <Box
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
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
            disabled={cart.length === 0}
            onClick={() => setPaymentModalOpen(true)}
            fz="md"
            fw={600}
          >
            {total.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł · Dalej
          </Button>
        </Container>
      </Box>

      {/* ===== ADD MODAL ===== */}
      <Modal
        opened={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setSearchQuery("");
        }}
        title={
          <Text fw={700} fz="lg">
            Dodaj
          </Text>
        }
        size="lg"
      >
        <SegmentedControl
          fullWidth
          value={addTab}
          onChange={setAddTab}
          data={[
            { label: "Usługi", value: "services" },
            { label: "Produkty", value: "products" },
          ]}
          mb="md"
        />
        <TextInput
          placeholder="Szukaj..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          mb="md"
        />
        <Stack gap={0}>
          {addTab === "services" &&
            filteredServices.map((service) => (
              <div key={service.id}>
                <UnstyledButton w="100%" py="sm" onClick={() => addToCart(service, "service")}>
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
          {addTab === "products" &&
            filteredProducts.map((product) => (
              <div key={product.id}>
                <UnstyledButton w="100%" py="sm" onClick={() => addToCart(product, "product")}>
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

      {/* ===== DISCOUNT MODAL ===== */}
      <Modal
        opened={discountModalOpen}
        onClose={() => setDiscountModalOpen(false)}
        title={
          <Text fw={700} fz="lg">
            Rabat
          </Text>
        }
        size="sm"
      >
        <Stack gap="md">
          <SegmentedControl
            fullWidth
            value={tempDiscountType}
            onChange={(val) => setTempDiscountType(val as "percent" | "amount")}
            data={[
              { label: "Procentowy (%)", value: "percent" },
              { label: "Kwotowy (zł)", value: "amount" },
            ]}
          />
          <NumberInput
            label={tempDiscountType === "percent" ? "Procent rabatu" : "Kwota rabatu (zł)"}
            value={tempDiscountValue}
            onChange={setTempDiscountValue}
            min={0}
            max={tempDiscountType === "percent" ? 100 : subtotal}
            suffix={tempDiscountType === "percent" ? "%" : " zł"}
          />
          <Group justify="space-between">
            <Button variant="subtle" color="red" onClick={clearDiscount}>
              Usuń rabat
            </Button>
            <Button onClick={applyDiscount}>Zastosuj</Button>
          </Group>
        </Stack>
      </Modal>

      {/* ===== PAYMENT MODAL ===== */}
      <Modal
        opened={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setVoucherStep(false);
          setVoucherAmount("");
        }}
        title={
          <Text fw={700} fz="lg">
            Płatność
          </Text>
        }
        size="sm"
      >
        {!voucherStep ? (
          <>
            <Box mb="lg" ta="center">
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
                Do zapłaty
              </Text>
              <Text fw={700} fz={36}>
                {total.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł
              </Text>
            </Box>
            <Stack gap="sm">
              <Button
                fullWidth
                size="lg"
                variant="light"
                color="green"
                leftSection={<IconCash size={22} />}
                onClick={finalize}
              >
                Gotówka
              </Button>
              <Button
                fullWidth
                size="lg"
                variant="light"
                color="blue"
                leftSection={<IconCreditCard size={22} />}
                onClick={finalize}
              >
                Karta
              </Button>
              <Button
                fullWidth
                size="lg"
                variant="light"
                color="pink"
                leftSection={<IconDeviceMobile size={22} />}
                onClick={finalize}
              >
                BLIK
              </Button>
              <Button
                fullWidth
                size="lg"
                variant="light"
                color="gray"
                leftSection={<IconArrowsSplit size={22} />}
                onClick={() => {
                  setSplitCashAmount("");
                  setSplitModal(true);
                }}
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
                  setVoucherAmount("");
                }}
              >
                Bon podarunkowy
              </Button>
            </Stack>
          </>
        ) : (
          <Stack gap="md">
            <Box ta="center" mb="sm">
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
                Do zapłaty
              </Text>
              <Text fw={700} fz={28}>
                {total.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł
              </Text>
            </Box>

            <NumberInput
              label="Wartość bonu"
              placeholder="Wpisz kwotę bonu"
              value={voucherAmount}
              onChange={setVoucherAmount}
              min={0}
              suffix=" zł"
              size="md"
            />

            {Number(voucherAmount) > 0 && Number(voucherAmount) < total && (
              <Box
                p="md"
                style={{
                  borderRadius: "var(--mantine-radius-md)",
                  border: "1px solid var(--mantine-color-default-border)",
                }}
              >
                <Text fz="sm" fw={500} mb="xs">
                  Dopłata:{" "}
                  <Text span fw={700}>
                    {(total - Number(voucherAmount)).toLocaleString("pl-PL", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    zł
                  </Text>
                </Text>
                <Text fz="xs" c="dimmed" mb="sm">
                  Wybierz metodę dopłaty:
                </Text>
                <Group gap="sm">
                  <Button
                    variant="light"
                    color="green"
                    size="xs"
                    leftSection={<IconCash size={16} />}
                    onClick={finalize}
                  >
                    Gotówka
                  </Button>
                  <Button
                    variant="light"
                    color="blue"
                    size="xs"
                    leftSection={<IconCreditCard size={16} />}
                    onClick={finalize}
                  >
                    Karta
                  </Button>
                  <Button
                    variant="light"
                    color="pink"
                    size="xs"
                    leftSection={<IconDeviceMobile size={16} />}
                    onClick={finalize}
                  >
                    BLIK
                  </Button>
                </Group>
              </Box>
            )}

            {Number(voucherAmount) >= total && Number(voucherAmount) > 0 && (
              <Box
                p="md"
                style={{
                  borderRadius: "var(--mantine-radius-md)",
                  backgroundColor: "var(--mantine-color-green-light)",
                }}
              >
                <Text fz="sm" c="green" fw={500}>
                  Bon pokrywa całą kwotę
                  {Number(voucherAmount) > total && (
                    <Text span fz="xs" c="dimmed">
                      {" "}
                      (reszta na bonie:{" "}
                      {(Number(voucherAmount) - total).toLocaleString("pl-PL", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      zł)
                    </Text>
                  )}
                </Text>
              </Box>
            )}

            <Group>
              <Button variant="subtle" onClick={() => setVoucherStep(false)}>
                Wstecz
              </Button>
              <Button
                flex={1}
                size="lg"
                color="yellow"
                disabled={!Number(voucherAmount)}
                leftSection={<IconGift size={20} />}
                onClick={() => {
                  if (Number(voucherAmount) >= total) {
                    finalize();
                  }
                }}
              >
                {Number(voucherAmount) >= total ? "Zapłać bonem" : "Wpisz kwotę bonu"}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* ===== CUSTOM TIP MODAL ===== */}
      <Modal
        opened={customTipModal}
        onClose={() => setCustomTipModal(false)}
        title={
          <Text fw={700} fz="lg">
            Napiwek
          </Text>
        }
        size="xs"
      >
        <Stack gap="md">
          <NumberInput
            label="Kwota napiwku"
            placeholder="0"
            value={customTipValue}
            onChange={setCustomTipValue}
            min={0}
            suffix=" zł"
            size="lg"
          />
          <Button
            fullWidth
            onClick={() => {
              setTipAmount(Number(customTipValue) || 0);
              setCustomTipModal(false);
            }}
          >
            Zatwierdź
          </Button>
        </Stack>
      </Modal>

      {/* ===== SPLIT PAYMENT MODAL (cash + card) ===== */}
      <Modal
        opened={splitModal}
        onClose={() => setSplitModal(false)}
        title={
          <Text fw={700} fz="lg">
            Gotówka + Karta
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
              {total.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł
            </Text>
          </Box>

          <NumberInput
            label="Kwota gotówką"
            placeholder="0"
            value={splitCashAmount}
            onChange={setSplitCashAmount}
            min={0}
            max={total}
            suffix=" zł"
            size="md"
          />

          {Number(splitCashAmount) > 0 && (
            <Box
              p="md"
              style={{
                borderRadius: "var(--mantine-radius-md)",
                border: "1px solid var(--mantine-color-default-border)",
              }}
            >
              <Group justify="space-between">
                <Text fz="sm">Gotówka:</Text>
                <Text fz="sm" fw={600}>
                  {Number(splitCashAmount).toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              <Group justify="space-between">
                <Text fz="sm">Karta:</Text>
                <Text fz="sm" fw={600}>
                  {(total - Number(splitCashAmount)).toLocaleString("pl-PL", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  zł
                </Text>
              </Group>
            </Box>
          )}

          <Button
            fullWidth
            size="lg"
            disabled={!Number(splitCashAmount) || Number(splitCashAmount) >= total}
            onClick={() => {
              setSplitModal(false);
              setSplitCashAmount("");
              finalize();
            }}
          >
            Zapłać
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}
