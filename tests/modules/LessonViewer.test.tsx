import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LessonViewer } from "@/modules/LessonViewer";

describe("LessonViewer", () => {
  it("renders the hello chapter", async () => {
    render(<LessonViewer slug="00-hello" />);
    await waitFor(() => {
      expect(screen.getByText("你好,记账杀手")).toBeInTheDocument();
    });
  });

  it("shows error when chapter does not exist", async () => {
    render(<LessonViewer slug="99-does-not-exist" />);
    await waitFor(() => {
      expect(screen.getByText(/加载失败/)).toBeInTheDocument();
    });
  });
});
