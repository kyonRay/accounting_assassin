import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModeIndicator } from "@/components/ModeIndicator";
import { useProgress } from "@/modules/Progress";

beforeEach(() => {
  useProgress.getState().resetProgress();
  localStorage.clear();
});

describe("ModeIndicator", () => {
  it("shows sandbox chip when mode is sandbox", () => {
    useProgress.setState({ mode: "sandbox" });
    render(<ModeIndicator />);
    expect(screen.getByText("🧪 沙箱模式")).toBeInTheDocument();
  });

  it("shows realenv chip when mode is real", () => {
    useProgress.setState({ mode: "real" });
    render(<ModeIndicator />);
    expect(screen.getByText("🛠️ 真实环境")).toBeInTheDocument();
  });

  it("sandbox chip does not appear when mode is real", () => {
    useProgress.setState({ mode: "real" });
    render(<ModeIndicator />);
    expect(screen.queryByText("🧪 沙箱模式")).toBeNull();
  });

  it("realenv chip does not appear when mode is sandbox", () => {
    useProgress.setState({ mode: "sandbox" });
    render(<ModeIndicator />);
    expect(screen.queryByText("🛠️ 真实环境")).toBeNull();
  });
});
