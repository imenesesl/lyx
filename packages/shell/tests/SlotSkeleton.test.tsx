import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { SlotSkeleton } from "../src/components/SlotSkeleton";

describe("SlotSkeleton", () => {
  it("renders with data-lyx-skeleton attribute", () => {
    const { container } = render(<SlotSkeleton position="top" slot="header" />);
    const el = container.querySelector("[data-lyx-skeleton='header']");
    expect(el).toBeTruthy();
  });

  it("renders aria-busy for accessibility", () => {
    const { container } = render(<SlotSkeleton position="center" slot="main" />);
    const el = container.querySelector("[aria-busy='true']");
    expect(el).toBeTruthy();
  });

  it("renders correct skeleton for each position", () => {
    const positions = ["top", "left", "center", "right", "bottom"];
    for (const pos of positions) {
      const { container } = render(<SlotSkeleton position={pos} slot={`slot-${pos}`} />);
      const el = container.querySelector(`[data-lyx-skeleton='slot-${pos}']`);
      expect(el).toBeTruthy();
    }
  });

  it("uses lyx-skeleton-line class for shimmer effect", () => {
    const { container } = render(<SlotSkeleton position="center" slot="content" />);
    const lines = container.querySelectorAll(".lyx-skeleton-line");
    expect(lines.length).toBeGreaterThan(0);
  });
});
