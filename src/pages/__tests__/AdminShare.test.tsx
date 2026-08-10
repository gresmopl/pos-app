import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

const mockNotificationsShow = vi.fn();
const mockWriteText = vi.fn().mockResolvedValue(undefined);

vi.mock("@mantine/notifications", () => ({
  notifications: { show: (...args: unknown[]) => mockNotificationsShow(...args) },
  Notifications: () => null,
}));

// PageHeader jest mockowany, wiec react-router nie trafia do grafu modulow tego testu.
vi.mock("@/components/layout/PageHeader", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

import AdminSharePage from "../AdminShare";

function renderPage() {
  return render(
    <MantineProvider>
      <AdminSharePage />
    </MantineProvider>
  );
}

describe("AdminSharePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // userEvent.setup() podmienia navigator.clipboard na wlasny stub, wiec nasz mock
  // musi byc zainstalowany PO nim - inaczej writeText nigdy nie zostanie wywolany.
  function stubClipboard(): void {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      configurable: true,
    });
  }

  it("pokazuje adres zlozony z origin i base path, a nie samego origin", () => {
    renderPage();
    const expected = `${window.location.origin}/`;
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("renderuje kod QR jako SVG", () => {
    const { container } = renderPage();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("kopiuje adres do schowka i potwierdza powiadomieniem", async () => {
    const user = userEvent.setup();
    stubClipboard();
    renderPage();

    await user.click(screen.getByRole("button", { name: /Skopiuj link/i }));

    expect(mockWriteText).toHaveBeenCalledWith(`${window.location.origin}/`);
    expect(mockNotificationsShow).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Link skopiowany" })
    );
  });
});
