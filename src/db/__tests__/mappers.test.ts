import { describe, it, expect } from "vitest";
import {
  mapEmployee,
  mapService,
  mapProduct,
  mapTransaction,
  mapCashMovement,
  mapSalon,
} from "../mappers";

function salonRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "s1",
    name: "FORMEN",
    admin_pin_hash: "hash123",
    operations_pin_hash: "hash456",
    cash_tolerance: 10,
    month_target: 600,
    default_commission_service: 40,
    default_commission_product: 20,
    ...overrides,
  };
}

describe("mapSalon", () => {
  it("mapuje standardowe wartości z bazy", () => {
    const result = mapSalon(salonRow());
    expect(result.cashTolerance).toBe(10);
    expect(result.monthTarget).toBe(600);
    expect(result.defaultCommissionService).toBe(40);
    expect(result.defaultCommissionProduct).toBe(20);
  });

  it("zachowuje 0 jako prawidłową wartość (nie zastępuje domyślną)", () => {
    const result = mapSalon(
      salonRow({
        cash_tolerance: 0,
        month_target: 0,
        default_commission_service: 0,
        default_commission_product: 0,
      })
    );
    expect(result.cashTolerance).toBe(0);
    expect(result.monthTarget).toBe(0);
    expect(result.defaultCommissionService).toBe(0);
    expect(result.defaultCommissionProduct).toBe(0);
  });

  it("używa domyślnych wartości gdy kolumna jest null", () => {
    const result = mapSalon(
      salonRow({
        cash_tolerance: null,
        month_target: null,
        default_commission_service: null,
        default_commission_product: null,
      })
    );
    expect(result.cashTolerance).toBe(10);
    expect(result.monthTarget).toBe(600);
    expect(result.defaultCommissionService).toBe(40);
    expect(result.defaultCommissionProduct).toBe(20);
  });

  it("używa domyślnych wartości gdy kolumna jest undefined", () => {
    const result = mapSalon({
      id: "s1",
      name: "FORMEN",
      admin_pin_hash: null,
      operations_pin_hash: null,
    });
    expect(result.cashTolerance).toBe(10);
    expect(result.monthTarget).toBe(600);
  });

  it("konwertuje stringi liczbowe z bazy", () => {
    const result = mapSalon(salonRow({ cash_tolerance: "5", month_target: "300" }));
    expect(result.cashTolerance).toBe(5);
    expect(result.monthTarget).toBe(300);
  });

  it("obsługuje puste stringi w hashach PIN", () => {
    const result = mapSalon(salonRow({ admin_pin_hash: null, operations_pin_hash: null }));
    expect(result.adminPinHash).toBe("");
    expect(result.operationsPinHash).toBe("");
  });
});

describe("mapEmployee", () => {
  function employeeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: "e1",
      name: "Jan Kowalski",
      avatar_url: null,
      role: "barber",
      tip_balance: 150,
      commission_service_percent: 40,
      commission_product_percent: 20,
      retention_percent: null,
      is_active: true,
      ...overrides,
    };
  }

  it("generuje avatar z pierwszych 2 liter imienia gdy brak avatar_url", () => {
    const result = mapEmployee(employeeRow());
    expect(result.avatar).toBe("JA");
  });

  it("używa avatar_url gdy dostępny", () => {
    const result = mapEmployee(employeeRow({ avatar_url: "https://img.com/jan.jpg" }));
    expect(result.avatar).toBe("https://img.com/jan.jpg");
  });

  it("zachowuje retentionPercent null gdy brak w bazie", () => {
    const result = mapEmployee(employeeRow({ retention_percent: null }));
    expect(result.retentionPercent).toBeNull();
  });

  it("mapuje retentionPercent gdy podane", () => {
    const result = mapEmployee(employeeRow({ retention_percent: 85 }));
    expect(result.retentionPercent).toBe(85);
  });

  it("zachowuje 0 w retentionPercent (nie null)", () => {
    const result = mapEmployee(employeeRow({ retention_percent: 0 }));
    expect(result.retentionPercent).toBe(0);
  });
});

describe("mapService", () => {
  function serviceRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: "srv1",
      name: "Strzyżenie",
      price: 60,
      price_from: false,
      description: null,
      display_order: 1,
      is_active: true,
      ...overrides,
    };
  }

  it("mapuje usługę ze standardowymi wartościami", () => {
    const result = mapService(serviceRow());
    expect(result.name).toBe("Strzyżenie");
    expect(result.price).toBe(60);
    expect(result.displayOrder).toBe(1);
  });

  it("ustawia description na undefined gdy null", () => {
    const result = mapService(serviceRow({ description: null }));
    expect(result.description).toBeUndefined();
  });
});

describe("mapProduct", () => {
  it("mapuje produkt", () => {
    const result = mapProduct({
      id: "p1",
      name: "Pasta do włosów",
      price: 45,
      description: "Mocna",
      is_active: true,
    });
    expect(result.name).toBe("Pasta do włosów");
    expect(result.price).toBe(45);
    expect(result.description).toBe("Mocna");
  });
});

describe("mapTransaction", () => {
  const items = [
    { name: "Strzyżenie", price: 60, type: "service" as const },
    { name: "Broda", price: 30, type: "service" as const },
  ];

  function txRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: "tx1",
      employee_id: "e1",
      client_name: null,
      total_amount: 90,
      tip_amount: 10,
      discount_type: null,
      discount_value: 0,
      date: "2026-04-21T12:00:00",
      ...overrides,
    };
  }

  it("mapuje transakcję bez rabatu", () => {
    const result = mapTransaction(txRow(), items, "Jan");
    expect(result.totalAmount).toBe(90);
    expect(result.tipAmount).toBe(10);
    expect(result.discountAmount).toBe(0);
  });

  it("oblicza rabat kwotowy", () => {
    const result = mapTransaction(
      txRow({ discount_type: "amount", discount_value: 15 }),
      items,
      "Jan"
    );
    expect(result.discountAmount).toBe(15);
  });

  it("oblicza rabat procentowy od sumy pozycji", () => {
    const result = mapTransaction(
      txRow({ discount_type: "percentage", discount_value: 10 }),
      items,
      "Jan"
    );
    expect(result.discountAmount).toBe(9);
  });

  it("rabat procentowy 0% daje 0 zł", () => {
    const result = mapTransaction(
      txRow({ discount_type: "percentage", discount_value: 0 }),
      items,
      "Jan"
    );
    expect(result.discountAmount).toBe(0);
  });
});

describe("mapCashMovement", () => {
  it("mapuje ruch kasowy", () => {
    const result = mapCashMovement(
      {
        id: "cm1",
        reason: "tip_withdrawal",
        amount: 50,
        description: "Napiwki za tydzień",
        created_at: "2026-04-21T18:00:00",
        status: null,
        final_cost: null,
      },
      "Jan"
    );
    expect(result.type).toBe("tip_withdrawal");
    expect(result.amount).toBe(50);
    expect(result.employeeName).toBe("Jan");
    expect(result.finalCost).toBeUndefined();
  });

  it("zachowuje finalCost 0 (nie undefined)", () => {
    const result = mapCashMovement(
      {
        id: "cm2",
        reason: "expense_settle",
        amount: 100,
        description: "",
        created_at: "2026-04-21T18:00:00",
        status: null,
        final_cost: 0,
      },
      "Jan"
    );
    expect(result.finalCost).toBe(0);
  });
});
