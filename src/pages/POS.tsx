import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useEmployees, useServices, useProducts } from "@/hooks/useDbData";
import { db } from "@/db";
import { Text, Group, Stack, Box, Avatar, Divider, Container, Badge, Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconDiscount2, IconCheck, IconChevronRight } from "@tabler/icons-react";
import { pluralize } from "@/lib/constants";
import { BOTTOM_NAV_HEIGHT } from "@/components/layout/BottomNavBar";
import { useCart } from "@/hooks/useCart";
import { useDeviceRole } from "@/contexts/DeviceContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { CartItemList } from "@/components/pos/CartItemList";
import { TipSelector } from "@/components/pos/TipSelector";
import { AddItemModal } from "@/components/pos/AddItemModal";
import { DiscountModal } from "@/components/pos/DiscountModal";
import { ConfirmModal } from "@/components/pos/ConfirmModal";

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
    setTipAmount,
    setDiscount,
    addToCart,
    updateQuantity,
    removeFromCart,
    resetCart,
  } = useCart();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [successData, setSuccessData] = useState<{
    total: number;
    employeeName: string;
  } | null>(null);

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
      const savedTotal = total;
      const savedName = employee?.name ?? "";
      setConfirmModalOpen(false);
      resetCart();
      if (navigator.vibrate) navigator.vibrate(100);
      setSuccessData({ total: savedTotal, employeeName: savedName });
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

  if (successData) {
    return (
      <Box mih="100vh" pb={BOTTOM_NAV_HEIGHT + 16}>
        <Stack align="center" justify="center" gap="lg" py={80} px="md">
          <Box
            p="xl"
            style={{
              borderRadius: "50%",
              backgroundColor: "var(--mantine-color-green-filled)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconCheck size={56} color="white" stroke={3} />
          </Box>
          <Text fw={700} fz={24}>
            Sprzedaż zapisana
          </Text>
          <Text fw={700} fz={48} c="green" lh={1}>
            {successData.total.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł
          </Text>
          <Box
            p="md"
            style={{
              borderRadius: "var(--mantine-radius-md)",
              backgroundColor: "var(--mantine-color-gray-light)",
            }}
          >
            <Text fz="sm" c="dimmed">
              Pracownik:{" "}
              <Text span fw={600}>
                {successData.employeeName}
              </Text>
            </Text>
          </Box>
          <Button
            fullWidth
            size="lg"
            maw={400}
            variant="light"
            color="green"
            onClick={() => setSuccessData(null)}
            mt="xl"
          >
            Następny klient
          </Button>
          <Button fullWidth size="lg" maw={400} variant="subtle" onClick={() => navigate("/")}>
            Wróć do ekranu głównego
          </Button>
        </Stack>
      </Box>
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

        {/* Client (optional) */}
        <Text fz="sm" c="dimmed" py="md">
          Klient przechodni
        </Text>

        <Divider />

        {/* Total */}
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

        {/* Cart */}
        <Box py="md">
          <CartItemList items={cart} onUpdateQuantity={updateQuantity} onRemove={removeFromCart} />
        </Box>

        {/* Tip */}
        {cart.length > 0 && (
          <>
            <Divider />
            <TipSelector tipAmount={tipAmount} onTipChange={setTipAmount} />
          </>
        )}

        {/* Action buttons */}
        <Divider />
        <Group py="md" gap="md">
          <Button
            variant="light"
            size="md"
            leftSection={<IconPlus size={18} />}
            onClick={() => setAddModalOpen(true)}
          >
            Dodaj
          </Button>
          <Button
            variant="light"
            size="md"
            leftSection={<IconDiscount2 size={18} />}
            onClick={() => setDiscountModalOpen(true)}
          >
            Rabat
          </Button>
        </Group>
      </Container>

      {/* Floating cart bar */}
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
            boxShadow: "0 -4px 12px rgba(0,0,0,0.1)",
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

      {/* Modals */}
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
