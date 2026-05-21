import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { BugReportCard } from "@/components/BugReportCard";

// Set up and tear down a clipboard mock
let clipboardWriteText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clipboardWriteText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: clipboardWriteText },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("BugReportCard — rendering", () => {
  it("renders the container with testid", () => {
    render(<BugReportCard />);
    expect(screen.getByTestId("bug-report-card")).toBeInTheDocument();
  });

  it("renders four textareas with correct aria-labels", () => {
    render(<BugReportCard />);
    expect(screen.getByRole("textbox", { name: "期望" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "实际" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "报错原文" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "我试过的" })).toBeInTheDocument();
  });

  it("renders the correct section labels (load-bearing text from spec)", () => {
    render(<BugReportCard />);
    expect(screen.getByText("【期望】")).toBeInTheDocument();
    expect(screen.getByText("【实际】")).toBeInTheDocument();
    expect(screen.getByText("【报错原文】")).toBeInTheDocument();
    expect(screen.getByText("【我试过的】")).toBeInTheDocument();
  });

  it("renders the 复制到剪贴板 button", () => {
    render(<BugReportCard />);
    expect(
      screen.getByRole("button", { name: "复制到剪贴板" }),
    ).toBeInTheDocument();
  });
});

describe("BugReportCard — default props", () => {
  it("pre-fills defaultExpected into the 期望 textarea", () => {
    render(<BugReportCard defaultExpected="脚本应该输出 summary.xlsx" />);
    const ta = screen.getByRole("textbox", { name: "期望" }) as HTMLTextAreaElement;
    expect(ta.value).toBe("脚本应该输出 summary.xlsx");
  });

  it("pre-fills defaultActual into the 实际 textarea", () => {
    render(<BugReportCard defaultActual="文件是空的" />);
    const ta = screen.getByRole("textbox", { name: "实际" }) as HTMLTextAreaElement;
    expect(ta.value).toBe("文件是空的");
  });

  it("pre-fills defaultTried into the 我试过的 textarea", () => {
    render(<BugReportCard defaultTried="我又跑了一遍，还是一样" />);
    const ta = screen.getByRole("textbox", { name: "我试过的" }) as HTMLTextAreaElement;
    expect(ta.value).toBe("我又跑了一遍，还是一样");
  });

  it("starts with empty 报错原文 (no defaultErrorText prop)", () => {
    render(<BugReportCard />);
    const ta = screen.getByRole("textbox", { name: "报错原文" }) as HTMLTextAreaElement;
    expect(ta.value).toBe("");
  });
});

describe("BugReportCard — copy to clipboard", () => {
  it("clicking 复制到剪贴板 calls navigator.clipboard.writeText", async () => {
    render(<BugReportCard />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "复制到剪贴板" }));
    });

    expect(clipboardWriteText).toHaveBeenCalledTimes(1);
  });

  it("clipboard content includes all four section labels", async () => {
    render(<BugReportCard />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "复制到剪贴板" }));
    });

    const content: string = clipboardWriteText.mock.calls[0][0];
    expect(content).toContain("【期望】");
    expect(content).toContain("【实际】");
    expect(content).toContain("【报错原文】");
    expect(content).toContain("【我试过的】");
  });

  it("clipboard content includes filled-in text from each textarea", async () => {
    render(<BugReportCard />);

    fireEvent.change(screen.getByRole("textbox", { name: "期望" }), {
      target: { value: "预期汇总结果" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "实际" }), {
      target: { value: "实际报错了" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "报错原文" }), {
      target: { value: "UnicodeDecodeError: 'utf-8' codec..." },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "我试过的" }), {
      target: { value: "重新跑了一次" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "复制到剪贴板" }));
    });

    const content: string = clipboardWriteText.mock.calls[0][0];
    expect(content).toContain("预期汇总结果");
    expect(content).toContain("实际报错了");
    expect(content).toContain("UnicodeDecodeError: 'utf-8' codec...");
    expect(content).toContain("重新跑了一次");
  });

  it("shows ✓ 已复制 feedback after clicking 复制", async () => {
    render(<BugReportCard />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "复制到剪贴板" }));
    });

    // After click, button text should change (clipboard promise resolved synchronously via vi.fn)
    expect(screen.getByRole("button", { name: "✓ 已复制" })).toBeInTheDocument();
    // The original button text should be gone
    expect(screen.queryByRole("button", { name: "复制到剪贴板" })).toBeNull();
  });

  it("复制 feedback reverts to '复制到剪贴板' after 2 seconds", async () => {
    vi.useFakeTimers();

    render(<BugReportCard />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "复制到剪贴板" }));
    });

    // Immediately after click → shows ✓ 已复制
    expect(screen.getByRole("button", { name: "✓ 已复制" })).toBeInTheDocument();

    // Advance 2 seconds using fake timers inside act() so React flushes the setState
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Should revert
    expect(screen.getByRole("button", { name: "复制到剪贴板" })).toBeInTheDocument();
  });

  it("clipboard content with defaultProps uses the pre-filled values", async () => {
    render(
      <BugReportCard
        defaultExpected="输出 CSV"
        defaultActual="文件是空的"
        defaultTried="跑了两次"
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "复制到剪贴板" }));
    });

    const content: string = clipboardWriteText.mock.calls[0][0];
    expect(content).toContain("输出 CSV");
    expect(content).toContain("文件是空的");
    expect(content).toContain("跑了两次");
  });
});
