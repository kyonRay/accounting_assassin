import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Callout } from "@/modules/LessonViewer/components/Callout";

describe("Callout", () => {
  it("renders children in tip variant", () => {
    render(<Callout type="tip">你做得很好</Callout>);
    expect(screen.getByText("你做得很好")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(
      <Callout type="warn" title="注意">
        小心这里
      </Callout>,
    );
    expect(screen.getByText("注意")).toBeInTheDocument();
    expect(screen.getByText("小心这里")).toBeInTheDocument();
  });

  it("applies different style classes per type", () => {
    const { container, rerender } = render(<Callout type="tip">A</Callout>);
    const tipEl = container.firstChild as HTMLElement;
    const tipClass = tipEl.className;
    rerender(<Callout type="warn">A</Callout>);
    const warnEl = container.firstChild as HTMLElement;
    // The two should differ in className (tip vs warn styling)
    expect(tipClass).not.toBe(warnEl.className);
  });
});
