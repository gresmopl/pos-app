import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { mockEmployees } from "@/data/employees";
import { mockServices } from "@/data/services";
import { mockProducts } from "@/data/products";
import {
  Text,
  Group,
  Box,
  Avatar,
  UnstyledButton,
  Divider,
  Container,
  Badge,
  Button,
} from "@mantine/core";
import { IconPlus, IconDiscount2 } from "@tabler/icons-react";
import { useCart } from "@/hooks/useCart";
import { PageHeader } from "@/components/layout/PageHeader";
import { CartItemList } from "@/components/pos/CartItemList";
import { TipSelector } from "@/components/pos/TipSelector";
import { AddItemModal } from "@/components/pos/AddItemModal";
import { DiscountModal } from "@/components/pos/DiscountModal";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { SplitPaymentModal } from "@/components/pos/SplitPaymentModal";
import { ConfirmModal } from "@/components/pos/ConfirmModal";

export default function POSPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get("employee");
  const employee = mockEmployees.find((e) => e.id === employeeId);

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
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState("");
  const [pendingPaymentDetails, setPendingPaymentDetails] = useState("");

  const requestFinalize = (method: string, details?: string) => {
    setPendingPaymentMethod(method);
    setPendingPaymentDetails(details || "");
    setPaymentModalOpen(false);
    setSplitModalOpen(false);
    setConfirmModalOpen(true);
  };

  const finalize = () => {
    setConfirmModalOpen(false);
    resetCart();
    if (navigator.vibrate) navigator.vibrate(100);
    navigate("/");
  };

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
        <UnstyledButton w="100%" py="md">
          <Group gap="sm" c="dimmed">
            <Text fz="sm">Wybierz klienta albo pozostaw puste</Text>
          </Group>
        </UnstyledButton>

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
            <TipSelector subtotal={subtotal} tipAmount={tipAmount} onTipChange={setTipAmount} />
          </>
        )}

        {/* Action buttons */}
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
          <UnstyledButton onClick={() => setDiscountModalOpen(true)}>
            <Group gap={6}>
              <IconDiscount2 size={18} />
              <Text fz="md" fw={500}>
                Rabat
              </Text>
            </Group>
          </UnstyledButton>
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
            onClick={() => setPaymentModalOpen(true)}
            fz="md"
            fw={600}
          >
            {total.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł · Dalej
          </Button>
        </Container>
      </Box>

      {/* Modals */}
      <AddItemModal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        services={mockServices}
        products={mockProducts}
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
      <PaymentModal
        opened={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        total={total}
        onSelectMethod={requestFinalize}
        onOpenSplit={() => {
          setPaymentModalOpen(false);
          setSplitModalOpen(true);
        }}
      />
      <SplitPaymentModal
        opened={splitModalOpen}
        onClose={() => setSplitModalOpen(false)}
        total={total}
        onConfirm={requestFinalize}
      />
      <ConfirmModal
        opened={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        total={total}
        employeeName={employee.name}
        itemCount={itemCount}
        paymentMethod={pendingPaymentMethod}
        paymentDetails={pendingPaymentDetails}
        tipAmount={tipAmount}
        discount={discount}
        discountAmount={discountAmount}
        onConfirm={finalize}
      />
    </Box>
  );
}
