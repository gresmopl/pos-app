import { describe, it, expect } from "vitest";
import { buildAppUrl } from "../appUrl";

describe("buildAppUrl", () => {
  it("zachowuje base path na GitHub Pages", () => {
    expect(buildAppUrl("https://user.github.io", "/pos-app/")).toBe(
      "https://user.github.io/pos-app/"
    );
  });

  it("działa dla aplikacji w korzeniu domeny", () => {
    expect(buildAppUrl("https://formen.pl", "/")).toBe("https://formen.pl/");
  });

  it("dokleja końcowy ukośnik, gdy base path go nie ma", () => {
    expect(buildAppUrl("https://formen.pl", "/pos-app")).toBe("https://formen.pl/pos-app/");
  });

  it("nie gubi portu w origin (tryb deweloperski)", () => {
    expect(buildAppUrl("http://localhost:5173", "/")).toBe("http://localhost:5173/");
  });
});
