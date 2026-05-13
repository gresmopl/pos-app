import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useEmployees, useServices, useProducts } from "@/hooks/useDbData";
import { db } from "@/db";
import {
  Text,
  Group,
  Box,
  Avatar,
  Divider,
  Container,
  Badge,
  Button,
  Modal,
  NumberInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconDiscount2, IconChevronRight, IconCoin } from "@tabler/icons-react";
import { pluralize } from "@/lib/constants";
import { BOTTOM_NAV_HEIGHT } from "@/components/layout/BottomNavBar";
import { useCart } from "@/hooks/useCart";
import { useDeviceRole } from "@/contexts/DeviceContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionLabel } from "@/components/layout/SectionLabel";
import { PageSkeleton } from "@/components/PageSkeleton";
import { CartItemList } from "@/components/pos/CartItemList";
import { TipModal } from "@/components/pos/TipModal";
import { AddItemModal } from "@/components/pos/AddItemModal";
import { DiscountModal } from "@/components/pos/DiscountModal";
import { ConfirmModal } from "@/components/pos/ConfirmModal";
import type { CartItem } from "@/lib/types";

export default function POSPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: employees = [], loading: empLoading } = useEmployees();
  const { data: services = [] } = useServices();
  const { data: products = [] } = useProducts();

  const { lockedEmployeeId } = useDeviceRole();
  const employeeId = lockedEmployeeId ?? searchParams.get("employee");
  const employee = employees.find((e) => e.id === employeeId);

  const {
    cart,
    tipAmount,
    discount,
    subtotal,
    discountAmount,
    total,
    itemCount,
    hasService,
    setTipAmount,
    setDiscount,
    addToCart,
    updateQuantity,
    updatePrice,
    removeFromCart,
    resetCart,
  } = useCart();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [priceEditItem, setPriceEditItem] = useState<CartItem | null>(null);
  const [priceEditValue, setPriceEditValue] = useState<number | string>("");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // UI cleanup: jesli useCart zerwal tip/discount (bo koszyk stracil usluge lub sie oproznił),
  // zamknij otwarte modale — w przeciwnym razie zostalyby otwarte z nieaktualnym stanem.
  useEffect(() => {
    if (!hasService) setTipModalOpen(false);
  }, [hasService]);

  useEffect(() => {
    if (cart.length === 0) setDiscountModalOpen(false);
  }, [cart.length]);

  const openPriceEdit = (item: CartItem) => {
    setPriceEditItem(item);
    setPriceEditValue(item.price);
  };

  const applyPriceEdit = () => {
    if (!priceEditItem) return;
    const parsed = Number(priceEditValue);
    if (!Number.isFinite(parsed) || parsed < 0.01) return;
    updatePrice(priceEditItem.cartId, parsed);
    setPriceEditItem(null);
    setPriceEditValue("");
  };

  const finalize = async () => {
    if (finalizing) return;
    setFinalizing(true);
    try {
      await db.transactions.create({
        employeeId: employeeId || "",
        items: cart,
        tipAmount,
        discount,
        discountAmount,
        totalAmount: total,
      });
      setConfirmModalOpen(false);
      resetCart();
      if (navigator.vibrate) navigator.vibrate(100);
    } catch (err) {
      console.error("[POS] Failed to save transaction:", err);
      notifications.show({
        message: "Nie udało się zapisać transakcji. Spróbuj ponownie.",
        color: "red",
      });
    } finally {
      setFinalizing(false);
    }
  };

  if (empLoading) {
    return <PageSkeleton />;
  }

  if (!employee) {
    return (
      <Container size="lg" py="xl">
        <Text>Nie znaleziono pracownika.</Text>
        <Button variant="subtle" mt="md" onClick={() => navigate("/")}>
          Powrót do ekranu głównego
        </Button>
      </Container>
    );
  }

  return (
    <Box mih="100vh" pb={100}>
      <Container size="lg">
        <PageHeader
          title="Sprzedaż"
          rightSection={
            <Group gap="sm">
              <Avatar size={32} radius="xl" color="green" variant="light">
                {employee.avatar}
              </Avatar>
              <Text fw={500} fz="md">
                {employee.name}
              </Text>
            </Group>
          }
        />

        <Divider />

        <Text fz="sm" c="dimmed" py="md">
          Klient przechodni
        </Text>

        <Divider />

        <Box py="md">
          <SectionLabel>Do zapłaty</SectionLabel>
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
            </Badge>
          )}
          {tipAmount > 0 && (
            <Badge
              size="sm"
              variant="light"
              color="green"
              ml={discount ? "xs" : 0}
              style={{ cursor: hasService ? "pointer" : "default" }}
              onClick={() => {
                if (hasService) setTipModalOpen(true);
              }}
            >
              Napiwek: +{tipAmount.toLocaleString("pl-PL")} zł
            </Badge>
          )}
        </Box>

        <Divider />

        <Box py="md">
          <CartItemList
            items={cart}
            onUpdateQuantity={updateQuantity}
            onEditPrice={openPriceEdit}
            onRemove={removeFromCart}
          />
        </Box>

        <Divider />
        <Group py="md" gap="md">
          <Button
            variant="light"
            size="md"
            leftSection={<IconPlus size={16} />}
            onClick={() => setAddModalOpen(true)}
          >
            Dodaj
          </Button>
          <Button
            variant={discount ? "filled" : "light"}
            size="md"
            leftSection={<IconDiscount2 size={16} />}
            onClick={() => setDiscountModalOpen(true)}
            disabled={cart.length === 0}
          >
            Rabat
          </Button>
          <Button
            variant={tipAmount > 0 ? "filled" : "light"}
            size="md"
            leftSection={<IconCoin size={16} />}
            onClick={() => setTipModalOpen(true)}
            disabled={!hasService}
          >
            Napiwek
          </Button>
        </Group>
      </Container>

      {cart.length > 0 && (
        <Box
          style={{
            position: "fixed",
            bottom: BOTTOM_NAV_HEIGHT,
            left: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: "var(--mantine-color-green-filled)",
            color: "white",
            cursor: "pointer",
            boxShadow: "var(--mantine-shadow-md)",
          }}
          p="md"
          onClick={() => setConfirmModalOpen(true)}
        >
          <Container size="lg">
            <Group justify="space-between">
              <div>
                <Text fz="xs" c="white" opacity={0.85}>
                  {pluralize(itemCount, "pozycja", "pozycje", "pozycji")}
                </Text>
                <Text fw={700} fz="xl" c="white">
                  {total.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł
                </Text>
              </div>
              <Group gap={4}>
                <Text fw={600} fz="md" c="white">
                  Podsumowanie
                </Text>
                <IconChevronRight size={18} color="white" />
              </Group>
            </Group>
          </Container>
        </Box>
      )}

      <AddItemModal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        services={services}
        products={products}
        onAdd={(item, type) => {
          addToCart(item, type);
          setAddModalOpen(false);
        }}
      />
      <DiscountModal
        opened={discountModalOpen}
        onClose={() => setDiscountModalOpen(false)}
        discount={discount}
        subtotal={subtotal}
        onApply={setDiscount}
      />
      <TipModal
        opened={tipModalOpen}
        onClose={() => setTipModalOpen(false)}
        tipAmount={tipAmount}
        onApply={setTipAmount}
      />
      <Modal
        opened={!!priceEditItem}
        onClose={() => {
          setPriceEditItem(null);
          setPriceEditValue("");
        }}
        title={
          <Text fw={700} fz="lg">
            Cena produktu
          </Text>
        }
        size="sm"
      >
        {priceEditItem && (
          <Box>
            <NumberInput
              label="Cena szt."
              data-autofocus
              value={priceEditValue}
              onChange={setPriceEditValue}
              min={0.01}
              decimalScale={2}
              suffix=" zł"
              size="lg"
              inputMode="decimal"
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button fullWidth size="lg" mt="md" onClick={applyPriceEdit}>
              Zastosuj
            </Button>
          </Box>
        )}
      </Modal>
      <ConfirmModal
        opened={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        total={total}
        employeeName={employee.name}
        itemCount={itemCount}
        tipAmount={tipAmount}
        discount={discount}
        discountAmount={discountAmount}
        onConfirm={finalize}
        loading={finalizing}
      />
    </Box>
  );
}
