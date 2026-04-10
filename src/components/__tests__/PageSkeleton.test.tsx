import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { PageSkeleton } from "../PageSkeleton";

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe("PageSkeleton", () => {
  it("should render without crashing", () => {
    const { container } = renderWithMantine(<PageSkeleton />);
    expect(container).toBeTruthy();
  });

  it("should render multiple child elements", () => {
    const { container } = renderWithMantine(<PageSkeleton />);
    const elements = container.querySelectorAll("div");
    expect(elements.length).toBeGreaterThan(5);
  });
});
