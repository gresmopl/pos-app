import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

const mockNavigate = vi.fn();
const mockCreateTx = vi.fn();
const mockResetCart = vi.fn();
const mockNotificationsShow = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams("?employee=emp-1")],
}));

vi.mock("@/db", () => ({
  db: {
    transactions: {
      create: (...args: unknown[]) => mockCreateTx(...args),
    },
  },
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: (...args: unknown[]) => mockNotificationsShow(...args) },
  Notifications: () => null,
}));

vi.mock("@/hooks/useDbData", () => ({
  useEmployees: () => ({
    data: [
      {
        id: "emp-1",
        name: "Anna",
        avatar: "A",
        role: "barber",
        todayRevenue: 0,
        todayServices: 0,
        tipBalance: 0,
        commissionServicePercent: 40,
        commissionProductPercent: 20,
        retentionPercent: null,
        displayOrder: 0,
        showRetentionBadge: false,
        isActive: true,
      },
    ],
    loading: false,
  }),
  useServices: () => ({ data: [], loading: false }),
  useProducts: () => ({ data: [], loading: false }),
}));

vi.mock("@/contexts/DeviceContext", () => ({
  useDeviceRole: () => ({ lockedEmployeeId: null, isAdmin: false, isPersonal: false }),
}));

vi.mock("@/hooks/useCart", () => ({
  useCart: () => ({
    cart: [
      {
        cartId: "c1",
        id: "s1",
        name: "Strzyżenie",
        price: 50,
        quantity: 1,
        type: "service" as const,
      },
    ],
    tipAmount: 10,
    discount: null,
    subtotal: 50,
    discountAmount: 0,
    total: 60,
    itemCount: 1,
    hasService: true,
    setTipAmount: vi.fn(),
    setDiscount: vi.fn(),
    addToCart: vi.fn(),
    updateQuantity: vi.fn(),
    updatePrice: vi.fn(),
    removeFromCart: vi.fn(),
    resetCart: mockResetCart,
  }),
}));

import POSPage from "../POS";

function renderPOS() {
  return render(
    <MantineProvider>
      <POSPage />
    </MantineProvider>
  );
}

describe("POSPage finalize flow", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockCreateTx.mockReset();
    mockResetCart.mockReset();
    mockNotificationsShow.mockReset();
  });

  it("renderuje ekran sprzedazy z imieniem pracownika", () => {
    renderPOS();
    expect(screen.getByText("Sprzedaż")).toBeInTheDocument();
    expect(screen.getAllByText("Anna").length).toBeGreaterThan(0);
  });

  it("po klikniciu Potwierdz wywoluje db.transactions.create i navigate('/')", async () => {
    mockCreateTx.mockResolvedValue(undefined);
    renderPOS();

    await userEvent.click(screen.getByText("Podsumowanie"));
    const confirmBtn = await screen.findByRole("button", { name: /potwierdź/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockCreateTx).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateTx).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: "emp-1",
        tipAmount: 10,
        totalAmount: 60,
      })
    );
    expect(mockResetCart).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("blad zapisu transakcji pokazuje notyfikacje i NIE nawiguje", async () => {
    mockCreateTx.mockRejectedValue(new Error("DB down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderPOS();
    await userEvent.click(screen.getByText("Podsumowanie"));
    const confirmBtn = await screen.findByRole("button", { name: /potwierdź/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockNotificationsShow).toHaveBeenCalled();
    });
    expect(mockNotificationsShow).toHaveBeenCalledWith(expect.objectContaining({ color: "red" }));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockResetCart).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
