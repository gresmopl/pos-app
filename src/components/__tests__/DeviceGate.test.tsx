import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { DeviceRegistration } from "@/lib/types";

// APP_VERSION wstrzykuje Vite przez `define` przy buildzie; vitest.config.ts tego
// nie robi, wiec bez podstawienia render rzuca ReferenceError.
beforeAll(() => {
  vi.stubGlobal("APP_VERSION", "0.0.0-test");
});

const DEVICE_ID = "5c4c2fa0-f085-455b-ab74-1f66b602ff7a";

const mockDevice = vi.fn();

vi.mock("@/contexts/DeviceContext", () => ({
  useDevice: () => mockDevice(),
}));

vi.mock("@/hooks/useDbData", () => ({
  useEmployees: () => ({ data: [], loading: false }),
}));

import { DeviceGate } from "../DeviceGate";

function device(over: Partial<DeviceRegistration> = {}): DeviceRegistration {
  return {
    id: "row-1",
    deviceId: DEVICE_ID,
    employeeId: null,
    deviceType: "personal",
    status: "blocked",
    deviceName: "Iphone Oliwia",
    registeredAt: "2026-04-14T10:00:00.000Z",
    approvedAt: null,
    lastSeenAt: "2026-08-10T10:00:00.000Z",
    isActive: false,
    ...over,
  };
}

function renderGate(status: DeviceRegistration["status"], dev: DeviceRegistration) {
  mockDevice.mockReturnValue({
    deviceId: DEVICE_ID,
    device: dev,
    status,
    register: vi.fn(),
    refetch: vi.fn(),
  });
  return render(
    <MantineProvider>
      <DeviceGate>
        <div>zawartosc aplikacji</div>
      </DeviceGate>
    </MantineProvider>
  );
}

describe("DeviceGate — ekran zablokowanego urzadzenia", () => {
  it("pokazuje nazwe i skrocone ID, zeby pracownik mogl je podac szefowi", () => {
    renderGate("blocked", device());

    expect(screen.getByText("Urządzenie zablokowane")).toBeInTheDocument();
    expect(screen.getByText("Iphone Oliwia")).toBeInTheDocument();
    expect(screen.getByText(/5c4c2fa0/)).toBeInTheDocument();
    // zawartosc aplikacji pozostaje niedostepna
    expect(screen.queryByText("zawartosc aplikacji")).not.toBeInTheDocument();
  });

  it("nie wywala sie, gdy urzadzenie nie ma nazwy", () => {
    renderGate("blocked", device({ deviceName: "" }));

    expect(screen.getByText("Urządzenie bez nazwy")).toBeInTheDocument();
    expect(screen.getByText(/5c4c2fa0/)).toBeInTheDocument();
  });
});

describe("DeviceGate — ekran oczekiwania", () => {
  it("pokazuje nazwe oraz skrocone ID", () => {
    renderGate("pending", device({ status: "pending", deviceName: "iPhone Kuba" }));

    expect(screen.getByText("Oczekiwanie na zatwierdzenie")).toBeInTheDocument();
    expect(screen.getByText("iPhone Kuba")).toBeInTheDocument();
    expect(screen.getByText(/5c4c2fa0/)).toBeInTheDocument();
  });
});

describe("DeviceGate — urzadzenie zatwierdzone", () => {
  it("przepuszcza zawartosc aplikacji", () => {
    renderGate("approved", device({ status: "approved" }));

    expect(screen.getByText("zawartosc aplikacji")).toBeInTheDocument();
    expect(screen.queryByText("Urządzenie zablokowane")).not.toBeInTheDocument();
  });
});
