import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { ConfirmModal } from "../ConfirmModal";

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

const baseProps = {
  opened: true,
  onClose: vi.fn(),
  total: 120,
  employeeName: "Anna",
  itemCount: 2,
  tipAmount: 0,
  discount: null,
  discountAmount: 0,
  onConfirm: vi.fn(),
};

describe("ConfirmModal", () => {
  it("pokazuje tytul, kwote, pracownika i liczbe pozycji", () => {
    renderWithMantine(<ConfirmModal {...baseProps} />);
    expect(screen.getByText("Potwierdzenie płatności")).toBeInTheDocument();
    expect(screen.getByText(/120,00 zł/)).toBeInTheDocument();
    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("ukrywa wiersz napiwku gdy tipAmount = 0", () => {
    renderWithMantine(<ConfirmModal {...baseProps} tipAmount={0} />);
    expect(screen.queryByText("Napiwek:")).not.toBeInTheDocument();
  });

  it("pokazuje napiwek gdy tipAmount > 0", () => {
    renderWithMantine(<ConfirmModal {...baseProps} tipAmount={15} />);
    expect(screen.getByText("Napiwek:")).toBeInTheDocument();
    expect(screen.getByText(/15 zł/)).toBeInTheDocument();
  });

  it("ukrywa wiersz rabatu gdy discount = null", () => {
    renderWithMantine(<ConfirmModal {...baseProps} discount={null} />);
    expect(screen.queryByText("Rabat:")).not.toBeInTheDocument();
  });

  it("pokazuje rabat kwotowy bez znaku procentu (ADR-011)", () => {
    renderWithMantine(
      <ConfirmModal {...baseProps} discount={{ type: "amount", value: 20 }} discountAmount={20} />
    );
    expect(screen.getByText("Rabat:")).toBeInTheDocument();
    expect(screen.getByText(/-20 zł/)).toBeInTheDocument();
    expect(screen.queryByText(/%\)/)).not.toBeInTheDocument();
  });

  it("klik Anuluj wywoluje onClose", async () => {
    const onClose = vi.fn();
    renderWithMantine(<ConfirmModal {...baseProps} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /anuluj/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("klik Potwierdz wywoluje onConfirm", async () => {
    const onConfirm = vi.fn();
    renderWithMantine(<ConfirmModal {...baseProps} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: /potwierdź/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("przycisk Potwierdz jest disabled w loading", () => {
    renderWithMantine(<ConfirmModal {...baseProps} loading />);
    const confirmBtn = screen.getByRole("button", { name: /potwierdź/i });
    expect(confirmBtn).toBeDisabled();
  });

  it("nie renderuje sie gdy opened=false", () => {
    renderWithMantine(<ConfirmModal {...baseProps} opened={false} />);
    expect(screen.queryByText("Potwierdzenie płatności")).not.toBeInTheDocument();
  });
});
