import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useEmployees, useServices, useProducts } from "@/hooks/useDbData";
import { db } from "@/db";
import { Text, Group, Box, Avatar, Divider, Container, Badge, Button } from "@mantine/core";
import { IconPlus, IconDiscount2 } from "@tabler/icons-react";
import { useCart } from "@/hooks/useCart";
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

  const employeeId = searchParams.get("employee");
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
      navigate("/");
    } catch (err) {
      console.error("[POS] Failed to save transaction:", err);
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

        {/* Client (optional) */}
        <Text fz="sm" c="dimmed" py="md">
          Klient anonimowy
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

      {/* Bottom CTA */}
      <Box
        style={{
          position: "fixed",
          bottom: 0,
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
            disabled={cart.length === 0}
            onClick={() => setConfirmModalOpen(true)}
            fz="md"
            fw={600}
          >
            {total.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł · Zatwierdź
          </Button>
        </Container>
      </Box>

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
