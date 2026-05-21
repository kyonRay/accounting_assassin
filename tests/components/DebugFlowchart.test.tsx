import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { DebugFlowchart } from "@/components/DebugFlowchart";

describe("DebugFlowchart", () => {
  it("renders the root container with testid", () => {
    render(<DebugFlowchart />);
    expect(screen.getByTestId("debug-flowchart")).toBeInTheDocument();
  });

  it("renders the poster title", () => {
    render(<DebugFlowchart />);
    expect(screen.getByText(/出 Bug 了.*标准处理流程/)).toBeInTheDocument();
  });

  it("renders the psychological-safety first step", () => {
    render(<DebugFlowchart />);
    expect(screen.getByText(/深呼吸.*Bug 是对话/)).toBeInTheDocument();
  });

  it("renders the pre-snapshot git commit step", () => {
    render(<DebugFlowchart />);
    expect(screen.getByText(/事前快照/)).toBeInTheDocument();
    expect(screen.getByText(/git commit -am 'before retry'/)).toBeInTheDocument();
  });

  it("renders the traceback reading step", () => {
    render(<DebugFlowchart />);
    expect(screen.getByText(/traceback 最后一行/)).toBeInTheDocument();
  });

  it("renders the four-part template step", () => {
    render(<DebugFlowchart />);
    expect(screen.getByText(/四段式模板/)).toBeInTheDocument();
    expect(screen.getByText(/期望.*实际.*报错原文.*我试过的/s)).toBeInTheDocument();
  });

  it("renders the verification step (再跑一遍 principle)", () => {
    render(<DebugFlowchart />);
    expect(screen.getByText(/再跑一遍/)).toBeInTheDocument();
  });

  it("renders success branch with git commit snapshot instruction", () => {
    render(<DebugFlowchart />);
    expect(screen.getByText(/✓ 修好了/)).toBeInTheDocument();
    // The success branch mentions committing
    const successText = screen.getByText(/git status.*git commit 快照/);
    expect(successText).toBeInTheDocument();
  });

  it("renders failure branch with git restore . option", () => {
    render(<DebugFlowchart />);
    expect(screen.getByText(/✗ 没修好.*改坏了/)).toBeInTheDocument();
    // git restore . appears in the failure branch
    const restoreText = screen.getByText(/git restore \./);
    expect(restoreText).toBeInTheDocument();
  });

  it("renders the StuckButton mention in failure branch", () => {
    render(<DebugFlowchart />);
    expect(screen.getByText(/我卡住了/)).toBeInTheDocument();
  });

  it("renders a forbidden git checkout . warning", () => {
    render(<DebugFlowchart />);
    // The text "禁用" and "git checkout ." are in separate elements (text + <code>),
    // so we use a custom matcher that checks the container's textContent.
    const container = screen.getByTestId("debug-flowchart");
    expect(container.textContent).toMatch(/禁用.*git checkout \./s);
  });

  it("has accessible aria-label on the flowchart container", () => {
    render(<DebugFlowchart />);
    const chart = screen.getByLabelText("Ch 8 调试工作流程图");
    expect(chart).toBeInTheDocument();
  });
});
